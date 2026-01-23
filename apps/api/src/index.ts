import { serve } from '@hono/node-server'
import { app } from './app.js'
import { startWorker } from './queue/worker.js'
import { loadDotEnv } from './config/env.js'
import { logger } from './lib/logger.js'

const port = Number(process.env.PORT ?? 8787)

loadDotEnv()
startWorker({ enabled: process.env.WORKER_ENABLED === '1' })

serve({ fetch: app.fetch, port })
logger.info({ port }, 'API server started')

