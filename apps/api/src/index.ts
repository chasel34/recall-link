import { serve } from '@hono/node-server'
import { app } from './app.js'
import { startWorker } from './queue/worker.js'
import { loadDotEnv } from './config/env.js'

const port = Number(process.env.PORT ?? 8787)

loadDotEnv()
startWorker({ enabled: process.env.WORKER_ENABLED === '1' })

serve({ fetch: app.fetch, port })
// eslint-disable-next-line no-console
console.log(`[api] listening on http://localhost:${port}`)
