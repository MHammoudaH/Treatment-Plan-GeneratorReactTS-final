import express from 'express';
import cors from 'cors';
import { config, warnOnStartup } from './config.js';
import './db.js'; // initialise + migrate the database on boot
import { authRouter } from './auth/routes.js';
import { requireAuth } from './auth/middleware.js';
import { zohoRouter, dealsHandler } from './zoho/routes.js';

const app = express();

app.use(
  cors({
    origin: config.appOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'treatment-plan-server', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/zoho', zohoRouter);
app.get('/api/deals', requireAuth, dealsHandler);

// 404 for unknown /api routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Central error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: 'internal_error' });
});

warnOnStartup();
app.listen(config.port, '0.0.0.0', () => {
  console.log(`[server] API listening on port ${config.port}`);
  console.log(`[server] CORS origin: ${config.appOrigin}`);
  console.log(`[server] Zoho callback: ${config.zoho.redirectUri}`);
});
