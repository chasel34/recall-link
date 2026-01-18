import { Hono } from 'hono';
import { apiRoutes } from './routes/api';
export const app = new Hono();
app.get('/', (c) => c.json({ ok: true, service: 'recall-api' }));
app.route('/api', apiRoutes);
