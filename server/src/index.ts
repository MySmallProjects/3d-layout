import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PORT, CLIENT_DIST, ensureDirectories } from './config';
import { initializeDatabase } from './db/schema';
import { versionRouter } from './routes/version';
import { modelsRouter } from './routes/models';
import { foldersRouter } from './routes/folders';
import { backgroundsRouter } from './routes/backgrounds';
import { scenesRouter } from './routes/scenes';
import { adminRouter } from './routes/admin';
import { lightingRouter } from './routes/lighting';
import { rendersRouter } from './routes/renders';

const app = express();

// Ensure data folders exist & SQLite is initialized
ensureDirectories();
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// API Routes
app.use('/api/version', versionRouter);
app.use('/api/models', modelsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/backgrounds', backgroundsRouter);
app.use('/api/scenes', scenesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/lighting', lightingRouter);
app.use('/api/renders', rendersRouter);

// Root healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In production, serve the built frontend if available
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({ success: false, error: message });
});

// Start listener if invoked directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server] 3D Layout backend listening on port ${PORT}`);
  });
}

export default app;
