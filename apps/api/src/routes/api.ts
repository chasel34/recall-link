import { Hono } from 'hono'

export const apiRoutes = new Hono()

apiRoutes.get('/health', (c) => c.json({ ok: true }))
