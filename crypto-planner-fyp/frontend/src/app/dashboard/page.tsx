'use client';

import { KYCPage } from "./kyc/page";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { investmentApi, walletApi } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import {
  TrendingUp, Wallet, Bitcoin, Coins, LogOut, DollarSign, 
  ArrowUpRight, ArrowDownRight, Clock, Calculator, ShieldCheck, History, ChevronDown
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────
interface WalletData {
  wallet: { usdBalance: number; btcBalance: number; ethBalance: number };
  values: { usd: number; btc: number; eth: number; total: number };
  prices: { btc: number; eth: number };
}

interface SimulationResult {
  simulation: {
    principal: number;
    asset: string;
    years: number;
    compoundFrequency: number;
    annualRate: number;
    totalAmount: number;
    totalInterest: number;
    returnPercentage: string;
  };
  projection: Array<{
    month: number;
    balance: number;
    principal: number;
    interest: number;
  }>;
}

interface Investment {
  id: string;
  asset: 'BTC' | 'ETH';
  principalAmount: number;
  currentBalance: number;
  totalInterestEarned: number;
  annualRate: number;
  compoundFrequency: number;
  status: string;
  startDate: string;
  maturityDate: string | null;
  lastAccrualAt: string;
}

interface LedgerEntry {
  id: string;
  type: string;
  asset: string | null;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

// ─── Components ────────────────────────────────────────

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'planner' | 'investments' | 'history' | 'kyc'>('overview')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-emerald-400 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-emerald-400" />
            <span className="text-xl font-bold">CryptoPlanner</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-400 text-sm">{user.fullName}</span>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1 w-fit border border-slate-800">
          {[
            { id: 'overview', label: 'Overview', icon: Wallet },
            { id: 'planner', label: 'Investment Planner', icon: Calculator },
            { id: 'investments', label: 'My Investments', icon: TrendingUp },
            { id: 'history', label: 'History', icon: History },
            { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'planner' && <PlannerTab />}
        {activeTab === 'investments' && <InvestmentsTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'kyc' && <KYCPage />}
      </div>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────

function OverviewTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    walletApi.getWallet()
      .then(setWallet)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;
  if (!wallet) return <ErrorCard message="Failed to load wallet" />;

  const { wallet: w, values, prices } = wallet;

  const cards = [
    {
      title: 'Total Portfolio Value',
      value: `$${values.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <DollarSign className="w-6 h-6 text-emerald-400" />,
      color: 'text-emerald-400',
    },
    {
      title: 'USD Balance',
      value: `$${w.usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <Wallet className="w-6 h-6 text-blue-400" />,
      color: 'text-blue-400',
    },
    {
      title: 'Bitcoin (BTC)',
      value: `${w.btcBalance.toFixed(8)} BTC`,
      subvalue: `$${values.btc.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <Bitcoin className="w-6 h-6 text-orange-400" />,
      color: 'text-orange-400',
    },
    {
      title: 'Ethereum (ETH)',
      value: `${w.ethBalance.toFixed(8)} ETH`,
      subvalue: `$${values.eth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <Coins className="w-6 h-6 text-purple-400" />,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">{card.title}</span>
              {card.icon}
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            {card.subvalue && <div className="text-slate-500 text-sm mt-1">{card.subvalue}</div>}
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Market Prices</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
            <Bitcoin className="w-10 h-10 text-orange-400" />
            <div>
              <div className="text-sm text-slate-400">Bitcoin</div>
              <div className="text-xl font-bold">${prices.btc.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
            <Coins className="w-10 h-10 text-purple-400" />
            <div>
              <div className="text-sm text-slate-400">Ethereum</div>
              <div className="text-xl font-bold">${prices.eth.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Investment Planner Tab ────────────────────────────

function PlannerTab() {
  const [principal, setPrincipal] = useState(1000);
  const [asset, setAsset] = useState<'BTC' | 'ETH'>('BTC');
  const [years, setYears] = useState(1);
  const [frequency, setFrequency] = useState(12);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const { user } = useAuth();
  const handleSimulate = async () => {
    setSimulating(true);
    setCreateSuccess(false);
    try {
      const data = await investmentApi.simulate(asset, principal, years, frequency);
      setResult(data);
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };
const handleCreateInvestment = async () => {
    if (!user || (user as any).kycStatus !== "APPROVED") {
      alert("Please complete your KYC Verification and get approved before creating an investment!");
      return;
  }    if (!result) return;
    setCreating(true);
    try {
      await investmentApi.create(asset, principal, years, frequency);
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to create investment');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-1">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            Plan Your Investment
          </h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Investment Amount (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  min={100}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Asset</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAsset('BTC')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition ${
                    asset === 'BTC'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Bitcoin className="w-5 h-5" />
                  Bitcoin
                </button>
                <button
                  onClick={() => setAsset('ETH')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition ${
                    asset === 'ETH'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Coins className="w-5 h-5" />
                  Ethereum
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time Horizon: <span className="text-emerald-400">{years} year{years > 1 ? 's' : ''}</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1Y</span><span>5Y</span><span>10Y</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Compounding</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
              >
                <option value={365}>Daily (365x/year)</option>
                <option value={12}>Monthly (12x/year)</option>
                <option value={1}>Yearly (1x/year)</option>
              </select>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 rounded-lg font-bold transition"
            >
              {simulating ? 'Calculating...' : 'Calculate Projection'}
            </button>
          </div>
        </div>

        {/* Chart Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Growth Projection</h3>

          {result ? (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={result.projection}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b" 
                    tickFormatter={(v) => `M${v}`}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorBalance)"
                    name="Total Value"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="principal"
                    stroke="#64748b"
                    fill="none"
                    strokeDasharray="5 5"
                    name="Principal"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Result Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <SummaryBox 
                  label="Principal" 
                  value={`$${result.simulation.principal.toLocaleString()}`} 
                  color="text-slate-300"
                />
                <SummaryBox 
                  label="Final Value" 
                  value={`$${result.simulation.totalAmount.toLocaleString()}`} 
                  color="text-emerald-400"
                />
                <SummaryBox 
                  label="Interest Earned" 
                  value={`$${result.simulation.totalInterest.toLocaleString()}`} 
                  color="text-cyan-400"
                />
                <SummaryBox 
                  label="Total Return" 
                  value={`${result.simulation.returnPercentage}%`} 
                  color="text-purple-400"
                />
              </div>

              <button
                onClick={handleCreateInvestment}
                disabled={creating}
                className="w-full mt-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 rounded-lg font-bold transition"
              >
                {creating ? 'Creating...' : `Invest $${principal} in ${asset}`}
              </button>

              {createSuccess && (
                <div className="mt-3 text-center text-emerald-400 text-sm">
                  ✅ Investment created successfully!
                </div>
              )}
            </>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Configure your investment and click Calculate to see projections</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 text-center">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ─── Investments Tab ───────────────────────────────────

function InvestmentsTab() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await investmentApi.getInvestments();
      setInvestments(data.investments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
    const interval = setInterval(fetchInvestments, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchInvestments]);

  if (loading) return <LoadingCard />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Active Investments</h3>
        <button
          onClick={fetchInvestments}
          className="text-sm text-emerald-400 hover:text-emerald-300 transition"
        >
          Refresh
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No investments yet. Go to the Investment Planner to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {investments.map((inv) => (
            <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    inv.asset === 'BTC' ? 'bg-orange-500/10' : 'bg-purple-500/10'
                  }`}>
                    {inv.asset === 'BTC' ? (
                      <Bitcoin className="w-6 h-6 text-orange-400" />
                    ) : (
                      <Coins className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{inv.asset}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        inv.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      Started {new Date(inv.startDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400">
                    {inv.currentBalance.toFixed(8)} {inv.asset}
                  </div>
                  <div className="text-sm text-slate-400">
                    Principal: {inv.principalAmount.toFixed(8)} {inv.asset}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 uppercase">Interest Earned</div>
                  <div className="text-emerald-400 font-medium">+{inv.totalInterestEarned.toFixed(8)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">APY</div>
                  <div className="text-white font-medium">{(inv.annualRate * 100).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase">Compounding</div>
                  <div className="text-white font-medium">
                    {inv.compoundFrequency === 365 ? 'Daily' : inv.compoundFrequency === 12 ? 'Monthly' : 'Yearly'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── History Tab ───────────────────────────────────────

function HistoryTab() {
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    investmentApi.getLedger()
      .then((data) => setTransactions(data.transactions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return <ArrowDownRight className="w-5 h-5 text-emerald-400" />;
      case 'INTEREST_PAYOUT': return <TrendingUp className="w-5 h-5 text-cyan-400" />;
      case 'INVESTMENT_CREATED': return <ArrowUpRight className="w-5 h-5 text-orange-400" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'text-emerald-400';
      case 'INTEREST_PAYOUT': return 'text-cyan-400';
      case 'INVESTMENT_CREATED': return 'text-orange-400';
      default: return 'text-slate-400';
    }
  };

  if (loading) return <LoadingCard />;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Transaction History</h3>

      {transactions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No transactions yet.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase">Asset</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-500 uppercase">Balance After</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(tx.type)}
                        <span className={`text-sm font-medium ${getTypeColor(tx.type)}`}>
                          {tx.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{tx.asset || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-slate-400">
                      {tx.balanceAfter.toFixed(8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Utility Components ────────────────────────────────

function LoadingCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
      <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-slate-400">Loading...</p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
      <p className="text-red-400">{message}</p>
    </div>
  );
}
