import Link from "next/link";
import { TrendingUp, Shield, BarChart3, Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <span className="text-xl font-bold">CryptoPlanner</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-slate-300 hover:text-white transition">
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Grow Your Crypto{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Wealth
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Simulate Bitcoin and Ethereum investments with a fixed 7% APY.
          Plan your financial future with our intelligent wealth management tools.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-lg transition"
          >
            Start Investing
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 border border-slate-700 hover:border-slate-500 rounded-xl font-bold text-lg transition"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Wallet className="w-10 h-10 text-orange-400" />}
            title="Simulated Wallet"
            description="Start with $10,000 USD and simulate BTC/ETH holdings. No real money required."
          />
          <FeatureCard
            icon={<BarChart3 className="w-10 h-10 text-cyan-400" />}
            title="7% APY Calculator"
            description="Visualize compound interest growth with interactive charts and projections."
          />
          <FeatureCard
            icon={<Shield className="w-10 h-10 text-purple-400" />}
            title="Secure & Transparent"
            description="Full transaction ledger, immutable records, and smart contract integration."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-r from-emerald-900/50 to-cyan-900/50 rounded-2xl p-12 border border-emerald-800/50">
          <h2 className="text-3xl font-bold mb-4">Ready to plan your future?</h2>
          <p className="text-slate-400 mb-8">Join thousands of students using CryptoPlanner for their FYP.</p>
          <Link
            href="/register"
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition inline-block"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 hover:border-slate-700 transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}
