import { PrismaClient, AssetType } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

/**
 * Compound Interest Calculator
 * Formula: A = P(1 + r/n)^(nt)
 * 
 * @param principal - Initial investment amount
 * @param annualRate - Annual interest rate (e.g., 0.07 for 7%)
 * @param compoundFrequency - Compounding periods per year (1, 12, or 365)
 * @param years - Investment duration in years
 * @returns Object with totalAmount and totalInterest
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  compoundFrequency: number,
  years: number
): { totalAmount: number; totalInterest: number } {
  const totalAmount = principal * Math.pow(1 + annualRate / compoundFrequency, compoundFrequency * years);
  const totalInterest = totalAmount - principal;

  return {
    totalAmount: parseFloat(totalAmount.toFixed(8)),
    totalInterest: parseFloat(totalInterest.toFixed(8)),
  };
}

/**
 * Calculate projection data for chart visualization
 * Returns monthly data points over the investment period
 */
export function calculateProjection(
  principal: number,
  annualRate: number,
  compoundFrequency: number,
  years: number
): Array<{ month: number; balance: number; principal: number; interest: number }> {
  const data = [];
  const totalMonths = years * 12;

  for (let month = 0; month <= totalMonths; month++) {
    const t = month / 12;
    const totalAmount = principal * Math.pow(1 + annualRate / compoundFrequency, compoundFrequency * t);
    const interestEarned = totalAmount - principal;

    data.push({
      month,
      balance: parseFloat(totalAmount.toFixed(2)),
      principal,
      interest: parseFloat(interestEarned.toFixed(2)),
    });
  }

  return data;
}

/**
 * Daily Interest Accrual Engine
 * Runs automatically via cron job to credit interest to active investments
 */
export async function accrueDailyInterest(): Promise<{ processed: number; totalInterest: number }> {
  const activeInvestments = await prisma.investment.findMany({
    where: { status: 'ACTIVE' },
    include: { user: { include: { wallet: true } } },
  });

  const annualRate = 0.07;
  // Daily compound rate: (1 + r/365)^1 - 1
  const dailyRate = Math.pow(1 + annualRate / 365, 1) - 1;

  let totalInterestDistributed = 0;

  for (const investment of activeInvestments) {
    const currentBalance = Number(investment.currentBalance);
    const interestEarned = currentBalance * dailyRate;
    totalInterestDistributed += interestEarned;

    const assetField = investment.asset === AssetType.BTC ? 'btcBalance' : 'ethBalance';

    // Atomic transaction: update investment, wallet, and ledger
    await prisma.$transaction([
      // Update investment balance
      prisma.investment.update({
        where: { id: investment.id },
        data: {
          currentBalance: { increment: interestEarned },
          totalInterestEarned: { increment: interestEarned },
          lastAccrualAt: new Date(),
        },
      }),

      // Update wallet balance
      prisma.wallet.update({
        where: { userId: investment.userId },
        data: {
          [assetField]: { increment: interestEarned },
        },
      }),

      // Record in immutable ledger
      prisma.ledger.create({
        data: {
          userId: investment.userId,
          type: 'INTEREST_PAYOUT',
          asset: investment.asset,
          amount: interestEarned,
          balanceAfter: currentBalance + interestEarned,
          description: `Daily interest accrual for ${investment.asset} investment`,
          metadata: {
            investmentId: investment.id,
            annualRate,
            dailyRate,
            previousBalance: currentBalance,
          },
        },
      }),
    ]);
  }

  console.log(`[${new Date().toISOString()}] Accrued interest for ${activeInvestments.length} investments. Total: $${totalInterestDistributed.toFixed(8)}`);

  return {
    processed: activeInvestments.length,
    totalInterest: parseFloat(totalInterestDistributed.toFixed(8)),
  };
}

/**
 * Start the interest accrual cron job
 * In production: runs daily at midnight UTC ('0 0 * * *')
 * For demo: runs every minute ('* * * * *') so you can see it working
 */
export function startInterestCron(): void {
  const schedule = process.env.NODE_ENV === 'production' ? '0 0 * * *' : '* * * * *';

  cron.schedule(schedule, async () => {
    console.log('⏰ Running scheduled interest accrual...');
    try {
      await accrueDailyInterest();
    } catch (error) {
      console.error('❌ Interest accrual failed:', error);
    }
  });

  console.log(`✅ Interest cron scheduled (${schedule})`);
}
