import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createItemSchema, patchItemSchema } from './items.schema'

export const itemsApp = new Hono()

itemsApp.post('/', zValidator('json', createItemSchema), (c) => {
  const body = c.req.valid('json')
  return c.json({
    error: 'NOT_IMPLEMENTED',
    message: 'items ingestion not implemented yet',
    received: body
  }, 501)
})

itemsApp.get('/', (c) => c.json({ items: [] }))
itemsApp.get('/:id', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.patch('/:id', zValidator('json', patchItemSchema), (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.delete('/:id', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
itemsApp.post('/:id/retry', (c) => c.json({ error: 'NOT_IMPLEMENTED' }, 501))
