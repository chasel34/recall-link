import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { chatRequestSchema } from './chat.schema.js'

export const chatApp = new Hono()

chatApp.post('/', zValidator('json', chatRequestSchema), (c) => {
  const body = c.req.valid('json')
  return c.json({
    error: 'NOT_IMPLEMENTED',
    message: 'chat not implemented yet',
    received: body
  }, 501)
})
