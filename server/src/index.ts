import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializePool, testConnection } from './db/connection';
import { serverConfig } from './config/database.config';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import layersRoutes from './routes/layers.routes';
import analysisRoutes from './routes/analysis.routes';
import { startWorker } from './queues/worker';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize database connection pool
initializePool();

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/layers', layersRoutes);
app.use('/api/analysis', analysisRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = serverConfig.port as number || 3000;

async function startServer() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start the analysis worker
    await startWorker();
    console.log('Analysis worker started');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${serverConfig.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
