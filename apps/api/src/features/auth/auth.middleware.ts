import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { getDb } from '../../db/context.js'
import { getUserFromSessionToken, type User } from './auth.db.js'

export type AuthUser = User

export const SESSION_COOKIE_NAME = 'rl_session'

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME)
  if (!token) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Login required' }, 401)
  }

  const db = getDb()
  const user = getUserFromSessionToken(db, token)
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid or expired session' }, 401)
  }

  c.set('user', user)
  await next()
}

export function getAuthUser(c: { get: (key: string) => unknown }): AuthUser {
  const user = c.get('user')
  if (!user || typeof user !== 'object') {
    throw new Error('Missing auth user in context')
  }
  return user as AuthUser
}
