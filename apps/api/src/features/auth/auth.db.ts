import type { Database } from 'better-sqlite3'
import crypto from 'node:crypto'

const SCRYPT_KEYLEN = 32
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 } as const

async function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(derivedKey as Buffer)
    })
  })
}

export type User = {
  id: string
  email: string
  created_at: string
}

export type UserWithPassword = User & {
  password_hash: string
  password_salt: string
}

export type Session = {
  id: string
  user_id: string
  token_hash: string
  created_at: string
  expires_at: string
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt)
  return { hash: derived.toString('hex'), salt }
}

export async function verifyPassword(password: string, salt: string, expectedHashHex: string): Promise<boolean> {
  const derived = await scrypt(password, salt)
  const expected = Buffer.from(expectedHashHex, 'hex')
  if (expected.length !== derived.length) return false
  return crypto.timingSafeEqual(expected, derived)
}

export function countUsers(db: Database): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number } | undefined
  return row?.c ?? 0
}

export function findUserByEmail(db: Database, email: string): UserWithPassword | null {
  const row = db
    .prepare('SELECT id, email, created_at, password_hash, password_salt FROM users WHERE email = ?')
    .get(email) as UserWithPassword | undefined
  return row ?? null
}

export function getUserById(db: Database, id: string): User | null {
  const row = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(id) as User | undefined
  return row ?? null
}

export function createUser(
  db: Database,
  data: { id: string; email: string; password_hash: string; password_salt: string; created_at: string }
): User {
  db.prepare(
    `
      INSERT INTO users (id, email, password_hash, password_salt, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(data.id, data.email, data.password_hash, data.password_salt, data.created_at)

  return { id: data.id, email: data.email, created_at: data.created_at }
}

export function createSession(
  db: Database,
  data: { id: string; user_id: string; token_hash: string; created_at: string; expires_at: string }
): Session {
  db.prepare(
    `
      INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(data.id, data.user_id, data.token_hash, data.created_at, data.expires_at)

  return {
    id: data.id,
    user_id: data.user_id,
    token_hash: data.token_hash,
    created_at: data.created_at,
    expires_at: data.expires_at,
  }
}

export function generateSessionToken(): string {
  // Stored only in cookie; DB stores a hash.
  return crypto.randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function getUserFromSessionToken(db: Database, token: string): User | null {
  const tokenHash = hashSessionToken(token)
  const row = db
    .prepare(
      `
        SELECT u.id, u.email, u.created_at, s.expires_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
        LIMIT 1
      `
    )
    .get(tokenHash) as (User & { expires_at: string }) | undefined

  if (!row) return null

  const expiresAt = Date.parse(row.expires_at)
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
    return null
  }

  return { id: row.id, email: row.email, created_at: row.created_at }
}

export function deleteSessionByToken(db: Database, token: string): { deleted: number } {
  const tokenHash = hashSessionToken(token)
  const res = db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
  return { deleted: res.changes }
}

export function claimAnonymousDataToUser(db: Database, userId: string): void {
  db.transaction(() => {
    db.prepare('UPDATE items SET user_id = ? WHERE user_id IS NULL').run(userId)
    db.prepare('UPDATE tags SET user_id = ? WHERE user_id IS NULL').run(userId)
    db.prepare('UPDATE chat_sessions SET user_id = ? WHERE user_id IS NULL').run(userId)
    db.prepare('UPDATE chat_messages SET user_id = ? WHERE user_id IS NULL').run(userId)
  })()
}
