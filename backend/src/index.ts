import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { connectDatabase } from './config/database';
import { config } from './config';
import authRoutes from './routes/auth';
import organizationRoutes from './routes/organizations';
import botRoutes from './routes/bots';
import chatRoutes from './routes/chat';
import webhookRoutes from './routes/webhooks';
import templateRoutes from './routes/templates';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, message: 'Too many requests' },
});
app.use('/api', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'CloudBot API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations/:orgId', organizationRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/templates', templateRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[App] Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

async function start(): Promise<void> {
  await connectDatabase();
  app.listen(config.port, () => {
    console.log(`[API] CloudBot API running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('[API] Failed to start:', err);
  process.exit(1);
});
