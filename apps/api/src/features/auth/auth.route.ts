import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getCookie, deleteCookie, setCookie } from 'hono/cookie'
import { getDb } from '../../db/context.js'
import { generateId } from '../../lib/utils.js'
import {
  claimAnonymousDataToUser,
  countUsers,
  createSession,
  createUser,
  deleteSessionByToken,
  findUserByEmail,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './auth.db.js'
import { loginSchema, registerSchema } from './auth.schema.js'
import { requireAuth, SESSION_COOKIE_NAME, getAuthUser } from './auth.middleware.js'

export const authApp = new Hono()

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function sessionCookieOptions(): Parameters<typeof setCookie>[3] {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  }
}

authApp.post('/register', zValidator('json', registerSchema), async (c) => {
  const db = getDb()
  const body = c.req.valid('json')
  const email = normalizeEmail(body.email)
  const password = body.password

  const existing = findUserByEmail(db, email)
  if (existing) {
    return c.json({ error: 'EMAIL_TAKEN', message: 'Email already registered' }, 409)
  }

  const usersBefore = countUsers(db)
  const now = new Date().toISOString()
  const userId = generateId('user')
  const sessionId = generateId('sess')
  const token = generateSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()

  const { hash: passwordHash, salt: passwordSalt } = await hashPassword(password)

  const user = db.transaction(() => {
    const created = createUser(db, {
      id: userId,
      email,
      password_hash: passwordHash,
      password_salt: passwordSalt,
      created_at: now,
    })

    if (usersBefore === 0) {
      claimAnonymousDataToUser(db, userId)
    }

    createSession(db, {
      id: sessionId,
      user_id: userId,
      token_hash: tokenHash,
      created_at: now,
      expires_at: expiresAt,
    })

    return created
  })()

  setCookie(c, SESSION_COOKIE_NAME, token, sessionCookieOptions())
  return c.json({ user }, 201)
})

authApp.post('/login', zValidator('json', loginSchema), async (c) => {
  const db = getDb()
  const body = c.req.valid('json')
  const email = normalizeEmail(body.email)
  const password = body.password

  const user = findUserByEmail(db, email)
  if (!user) {
    return c.json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, 401)
  }

  const ok = await verifyPassword(password, user.password_salt, user.password_hash)
  if (!ok) {
    return c.json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }, 401)
  }

  const now = new Date().toISOString()
  const sessionId = generateId('sess')
  const token = generateSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()

  db.transaction(() => {
    createSession(db, {
      id: sessionId,
      user_id: user.id,
      token_hash: tokenHash,
      created_at: now,
      expires_at: expiresAt,
    })
  })()

  setCookie(c, SESSION_COOKIE_NAME, token, sessionCookieOptions())
  return c.json({ user: { id: user.id, email: user.email, created_at: user.created_at } })
})

authApp.get('/me', requireAuth, (c) => {
  const user = getAuthUser(c)
  return c.json({ user })
})

authApp.post('/logout', (c) => {
  const db = getDb()
  const token = getCookie(c, SESSION_COOKIE_NAME)
  if (token) {
    deleteSessionByToken(db, token)
  }

  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
  return c.json({ ok: true })
})
