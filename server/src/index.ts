import express from 'express';
import cors from 'cors';
import { config, warnOnStartup } from './config.js';
import { pool } from './db.js';
import { assertSchemaReady, describeDbError } from './lib/migrations.js';
import { authRouter } from './auth/routes.js';
import { requireAuth } from './auth/middleware.js';
import { zohoRouter, dealsHandler } from './zoho/routes.js';
import { teamRouter } from './team/routes.js';
import { planningRouter } from './planning/routes.js';

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
app.use('/api/team', teamRouter);
app.use('/api/planning', planningRouter);

// 404 for unknown /api routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Central error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: 'internal_error' });
});

async function start(): Promise<void> {
  warnOnStartup();
  try {
    // The server never changes the schema itself — it only verifies the database
    // is migrated up to date and refuses to start otherwise. Run `npm run migrate`.
    await assertSchemaReady(pool);
  } catch (err) {
    console.error(`[server] ${describeDbError(err)}`);
    console.error('[server] refusing to start against an un-migrated / unreachable database.');
    process.exit(1);
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[server] API listening on port ${config.port}`);
    console.log(`[server] CORS origin: ${config.appOrigin}`);
    console.log(`[server] Zoho callback: ${config.zoho.redirectUri}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received — shutting down`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void start();
