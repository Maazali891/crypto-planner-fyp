import { Router } from 'express';
import { PrismaClient, AssetType } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { calculateCompoundInterest, calculateProjection } from '../services/interestEngine';

const router = Router();
const prisma = new PrismaClient();

// Mock prices for conversion
const PRICES = { BTC: 65000, ETH: 3500 };

const createInvestmentSchema = z.object({
  asset: z.enum(['BTC', 'ETH']),
  amount: z.number().positive(),
  years: z.number().int().min(1).max(10),
  compoundFrequency: z.number().int().min(1).max(365),
});

/**
 * POST /api/investments/simulate
 * Calculate projection without creating an investment
 */
router.post('/simulate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { asset, amount, years, compoundFrequency } = createInvestmentSchema.parse(req.body);

    const result = calculateCompoundInterest(amount, 0.07, compoundFrequency, years);
    const projection = calculateProjection(amount, 0.07, compoundFrequency, years);

    res.json({
      simulation: {
        principal: amount,
        asset,
        years,
        compoundFrequency,
        annualRate: 0.07,
        totalAmount: result.totalAmount,
        totalInterest: result.totalInterest,
        returnPercentage: ((result.totalInterest / amount) * 100).toFixed(2),
      },
      projection,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Simulation failed' });
  }
});

/**
 * POST /api/investments
 * Create a real investment (deducts from USD balance, credits crypto balance)
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { asset, amount, years, compoundFrequency } = createInvestmentSchema.parse(req.body);

    const userId = req.user!.userId;
    const assetType = asset as AssetType;
    const assetField = asset === 'BTC' ? 'btcBalance' : 'ethBalance';

    // Convert USD to crypto amount
    const cryptoAmount = amount / PRICES[asset];

    const investment = await prisma.$transaction(async (tx) => {
      // Check USD balance
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet || Number(wallet.usdBalance) < amount) {
        throw new Error('Insufficient USD balance');
      }

      // Deduct USD, add crypto
      await tx.wallet.update({
        where: { userId },
        data: {
          usdBalance: { decrement: amount },
          [assetField]: { increment: cryptoAmount },
        },
      });

      // Create investment record
      const inv = await tx.investment.create({
        data: {
          userId,
          asset: assetType,
          principalAmount: cryptoAmount,
          currentBalance: cryptoAmount,
          annualRate: 0.07,
          compoundFrequency,
          maturityDate: new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000),
        },
      });

      // Record ledger entries
      await tx.ledger.create({
        data: {
          userId,
          type: 'INVESTMENT_CREATED',
          asset: assetType,
          amount: cryptoAmount,
          balanceAfter: cryptoAmount,
          description: `Created ${asset} investment`,
          metadata: { investmentId: inv.id, usdSpent: amount, years },
        },
      });

      return inv;
    });

    res.status(201).json({
      message: 'Investment created successfully',
      investment: {
        ...investment,
        principalAmount: Number(investment.principalAmount),
        currentBalance: Number(investment.currentBalance),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    if (error.message === 'Insufficient USD balance') {
      res.status(400).json({ error: 'Insufficient USD balance' });
      return;
    }
    console.error('Investment creation error:', error);
    res.status(500).json({ error: 'Failed to create investment' });
  }
});

/**
 * GET /api/investments
 * Get all investments for current user
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const investments = await prisma.investment.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      investments: investments.map(inv => ({
        ...inv,
        principalAmount: Number(inv.principalAmount),
        currentBalance: Number(inv.currentBalance),
        totalInterestEarned: Number(inv.totalInterestEarned),
        annualRate: Number(inv.annualRate),
      })),
    });
  } catch (error) {
    console.error('Fetch investments error:', error);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

/**
 * GET /api/investments/ledger
 * Get transaction history
 */
router.get('/ledger', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const ledgers = await prisma.ledger.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      transactions: ledgers.map(tx => ({
        ...tx,
        amount: Number(tx.amount),
        balanceAfter: Number(tx.balanceAfter),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

export default router;
