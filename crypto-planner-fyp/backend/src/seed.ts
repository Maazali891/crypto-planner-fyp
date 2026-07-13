import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo user
  const passwordHash = await bcrypt.hash('demo123', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@cryptoplanner.com' },
    update: {},
    create: {
      email: 'demo@cryptoplanner.com',
      passwordHash,
      fullName: 'Demo User',
      wallet: {
        create: {
          usdBalance: 50000.00,
          btcBalance: 0.5,
          ethBalance: 5.0,
        },
      },
    },
  });

  console.log('✅ Demo user created:', demoUser.email);
  console.log('   Password: demo123');
  console.log('   Starting balance: $50,000 USD + 0.5 BTC + 5.0 ETH');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
