import type { Hono } from 'hono'

export async function registerTestUser(
  app: Hono,
  opts: { email?: string; password?: string } = {}
): Promise<{ cookie: string; user: { id: string; email: string } }> {
  const email = opts.email ?? 'test@example.com'
  const password = opts.password ?? 'password123'

  const res = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (res.status !== 201) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to register test user: HTTP ${res.status} ${text}`)
  }

  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) {
    throw new Error('Missing Set-Cookie header')
  }

  const cookie = setCookie.split(';')[0] ?? ''
  if (!cookie) {
    throw new Error('Failed to parse session cookie')
  }

  const body = (await res.json()) as { user: { id: string; email: string } }
  return { cookie, user: body.user }
}
