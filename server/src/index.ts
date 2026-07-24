import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { config } from './config/env.js';
import { initDatabase, closeDatabase } from './config/database.js';
import { runMigrations } from './config/migrate.js';
import { initializeSocket } from './websocket/socketHandler.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// ── App Setup ───────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

// ── Middleware ───────────────────────────────────────────────────────

app.use(cors({
  origin: true, // Allow all origins in dev & ngrok tunnels
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const uploadsDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── Start Server ────────────────────────────────────────────────────

async function startServer() {
  // Initialize database (async for sql.js)
  await initDatabase();
  await runMigrations();

  // Initialize Socket.io
  initializeSocket(httpServer);

  // ── API Routes ──────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/ai', aiRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: 'connected',
      server: 'running',
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  httpServer.listen(config.port, () => {
    console.log('\n' + '═'.repeat(50));
    console.log('🚀 Smart Inventory AI Server');
    console.log('═'.repeat(50));
    console.log(`📡 Server:      http://localhost:${config.port}`);
    console.log(`🔌 Socket.io:   ws://localhost:${config.port}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`🗄️  Database:    ${config.database.path}`);
    console.log('═'.repeat(50) + '\n');
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// ── Graceful Shutdown ───────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  closeDatabase();
  httpServer.close(() => { console.log('👋 Server stopped'); process.exit(0); });
});

export { app, httpServer };
