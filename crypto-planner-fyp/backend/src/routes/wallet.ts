import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/wallet
 * Get current user's wallet balances
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    // Mock crypto prices (in a real app, fetch from CoinGecko API)
    const btcPrice = 65000;
    const ethPrice = 3500;

    const usdValue = Number(wallet.usdBalance);
    const btcValue = Number(wallet.btcBalance) * btcPrice;
    const ethValue = Number(wallet.ethBalance) * ethPrice;
    const totalValue = usdValue + btcValue + ethValue;

    res.json({
      wallet: {
        usdBalance: Number(wallet.usdBalance),
        btcBalance: Number(wallet.btcBalance),
        ethBalance: Number(wallet.ethBalance),
      },
      values: {
        usd: usdValue,
        btc: btcValue,
        eth: ethValue,
        total: totalValue,
      },
      prices: { btc: btcPrice, eth: ethPrice },
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

/**
 * POST /api/wallet/deposit
 * Deposit USD into wallet (simulated fiat on-ramp)
 */
router.post('/deposit', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount <= 0) {
      res.status(400).json({ error: 'Invalid deposit amount' });
      return;
    }

    const updatedWallet = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { userId: req.user!.userId },
        data: { usdBalance: { increment: depositAmount } },
      });

      await tx.ledger.create({
        data: {
          userId: req.user!.userId,
          type: 'DEPOSIT',
          amount: depositAmount,
          balanceAfter: Number(wallet.usdBalance),
          description: 'USD deposit',
          metadata: { method: 'simulated_bank_transfer' },
        },
      });

      return wallet;
    });

    res.json({
      message: 'Deposit successful',
      wallet: updatedWallet,
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

export default router;
