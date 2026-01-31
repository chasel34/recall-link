import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { apiRoutes } from './routes/api.js'
import { loggerMiddleware } from './middleware/logger.js'

export const app = new Hono()

app.use('*', loggerMiddleware)

const webOrigins = (() => {
  const raw = (process.env.WEB_ORIGINS ?? '').trim()
  if (!raw) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000']
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
})()

app.use(
  '*',
  cors({
    origin: webOrigins,
    credentials: true,
  })
)

app.get('/', (c) => c.json({ ok: true, service: 'recall-api' }))

app.route('/api', apiRoutes)
