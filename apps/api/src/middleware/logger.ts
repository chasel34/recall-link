import type { MiddlewareHandler } from 'hono'
import { logger } from '../lib/logger.js'

/**
 * HTTP request/response logging middleware
 * Logs method, path, status code, and response time
 */
export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  const { method, path } = c.req

  try {
    await next()

    const duration = Date.now() - start
    const status = c.res.status

    // Log request/response
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    logger[logLevel](
      {
        method,
        path,
        status,
        duration,
      },
      'HTTP request'
    )
  } catch (error) {
    const duration = Date.now() - start
    // Log error with stack trace
    logger.error(
      {
        method,
        path,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Request failed'
    )
    throw error
  }
}
