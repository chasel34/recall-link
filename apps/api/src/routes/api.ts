import { Hono } from 'hono'
import { itemsApp } from '../features/items/items.route.js'
import { chatApp } from '../features/chat/chat.route.js'
import { eventsApp } from '../features/events/events.route.js'
import { tagsApp } from '../features/tags/tags.route.js'
import { authApp } from '../features/auth/auth.route.js'
import { settingsApp } from '../features/settings/ai-settings.route.js'
import { jobsApp } from '../features/jobs/jobs.route.js'

export const apiRoutes = new Hono()

apiRoutes.get('/health', (c) => c.json({ ok: true }))

apiRoutes.route('/auth', authApp)
apiRoutes.route('/items/events', eventsApp)
apiRoutes.route('/items', itemsApp)
apiRoutes.route('/tags', tagsApp)
apiRoutes.route('/chat', chatApp)
apiRoutes.route('/settings', settingsApp)
apiRoutes.route('/jobs', jobsApp)
