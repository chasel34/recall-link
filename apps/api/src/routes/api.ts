import { Hono } from 'hono'
import { itemsApp } from '../features/items/items.route'
import { chatApp } from '../features/chat/chat.route'
import { eventsApp } from '../features/events/events.route'

export const apiRoutes = new Hono()

apiRoutes.get('/health', (c) => c.json({ ok: true }))

apiRoutes.route('/items/events', eventsApp)
apiRoutes.route('/items', itemsApp)
apiRoutes.route('/chat', chatApp)
