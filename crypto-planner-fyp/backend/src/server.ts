import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { startInterestCron } from './services/interestEngine';

// Import routes
import kycRoutes from './routes/kyc.routes';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import investmentRoutes from './routes/investment';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-frontend-domain.com' 
    : 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging (helpful for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'crypto-planner-api',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/investments', investmentRoutes);

// Manual trigger for interest accrual (for testing)
app.post('/api/admin/accrue-interest', async (req, res) => {
  try {
    const { accrueDailyInterest } = await import('./services/interestEngine');
    const result = await accrueDailyInterest();
    res.json({ message: 'Interest accrual completed', result });
  } catch (error) {
    res.status(500).json({ error: 'Interest accrual failed' });
  }
});
app.use('/api/kyc', kycRoutes);
// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 Crypto Planner API Server Started                  ║');
  console.log(`║     Port: ${PORT}                                          ║`);
  console.log(`║     Environment: ${process.env.NODE_ENV || 'development'}                    ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Start the interest accrual cron job
  startInterestCron();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
