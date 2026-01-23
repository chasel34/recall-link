import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { apiRoutes } from './routes/api.js'
import { loggerMiddleware } from './middleware/logger.js'

export const app = new Hono()

app.use('*', loggerMiddleware)
app.use('*', cors())

app.get('/', (c) => c.json({ ok: true, service: 'recall-api' }))

app.route('/api', apiRoutes)
