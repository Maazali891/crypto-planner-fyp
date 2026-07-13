# 🚀 Crypto Investment & Wealth Management Planner

> Final Year Project (FYP) — A full-stack Web3 application for simulating crypto investments with 7% fixed APY.

## 📁 Project Structure

```
crypto-planner-fyp/
├── backend/          # Node.js + Express + Prisma + PostgreSQL API
├── frontend/         # Next.js 14 + Tailwind CSS + Recharts Dashboard
├── contracts/        # Solidity Smart Contracts (Hardhat)
└── README.md         # This file
```

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Railway/Supabase free tier)
- Git

---

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Run database migrations
npx prisma migrate dev --name init
npx prisma generate

# (Optional) Seed demo data
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:5000`

**Demo Account:**
- Email: `demo@cryptoplanner.com`
- Password: `demo123`

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

---

### 3. Smart Contracts (Optional — for Web3 demo)

```bash
cd contracts

# Install dependencies
npm install

# Start local Hardhat blockchain
npx hardhat node

# In a new terminal, deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# Run tests
npx hardhat test
```

---

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   Express   │────▶│  PostgreSQL │
│  Frontend   │◄────│    API      │◄────│   + Prisma  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Hardhat   │
                    │  (Local)    │
                    └─────────────┘
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | JWT-based signup/login with bcrypt hashing |
| 💰 Wallet | Simulated USD, BTC, ETH balances |
| 📊 Calculator | Compound interest projections with interactive charts |
| 🎯 Investments | Create BTC/ETH investments with 7% APY |
| ⚡ Auto Interest | Cron job accrues interest automatically |
| 📜 Ledger | Immutable transaction history |
| ⛓️ Smart Contract | Solidity vault for on-chain interest (demo) |

## 📚 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/wallet` | Get balances |
| POST | `/api/wallet/deposit` | Deposit USD |
| POST | `/api/investments/simulate` | Calculate projection |
| POST | `/api/investments` | Create investment |
| GET | `/api/investments` | List investments |
| GET | `/api/investments/ledger` | Transaction history |

## 🔒 Security Considerations

- ✅ Passwords hashed with bcrypt (cost factor 12)
- ✅ JWT tokens with short expiry (15 min access, 7 day refresh)
- ✅ Input validation with Zod schemas
- ✅ Prisma parameterized queries (SQL injection prevention)
- ✅ CORS configured for specific origins
- ✅ Immutable ledger (append-only transaction records)

## 📝 FYP Documentation

This project demonstrates:
- **Full-stack development** with modern React + Node.js
- **Database design** with relational modeling (PostgreSQL)
- **Financial algorithms** (compound interest calculation)
- **Web3 integration** (Solidity smart contracts)
- **Security best practices** (auth, validation, ledger immutability)
- **DevOps basics** (environment management, database migrations)

## 🎓 For Your Viva

Be ready to explain:
1. Why you chose **Next.js** over plain React
2. How the **compound interest formula** works in your code
3. The difference between your **backend interest engine** and **smart contract**
4. How you prevent **double interest accrual** (lastAccrualAt timestamp)
5. Your **database normalization** decisions

## 📄 License

MIT — For educational purposes only. This is a simulation, not a real financial product.

---

Built with ❤️ for Final Year Project 2026
