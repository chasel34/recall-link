import { Hono } from 'hono'
import { itemsApp } from '../features/items/items.route.js'
import { chatApp } from '../features/chat/chat.route.js'
import { eventsApp } from '../features/events/events.route.js'

export const apiRoutes = new Hono()

apiRoutes.get('/health', (c) => c.json({ ok: true }))

apiRoutes.route('/items/events', eventsApp)
apiRoutes.route('/items', itemsApp)
apiRoutes.route('/chat', chatApp)
