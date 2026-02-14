"use client";

import Link from "next/link";

const stats = [
  { label: "Smart Contracts", value: "30+" },
  { label: "Tests Passing", value: "378" },
  { label: "Protocol Layers", value: "5" },
  { label: "Fuzz Runs", value: "10,000" },
];

const layers = [
  {
    name: "Forge",
    subtitle: "Structured Credit",
    href: "/forge",
    description:
      "Institutional-grade credit vaults with senior/mezzanine/equity tranches. Waterfall yield distribution prioritizes senior holders. Invest, earn, and withdraw with full tranche isolation.",
    features: ["Senior/Mezz/Equity tranches", "Waterfall yield distribution", "Pull-based yield claiming"],
    color: "blue",
  },
  {
    name: "Shield",
    subtitle: "Credit Default Swaps",
    href: "/shield",
    description:
      "Hedge credit risk with bilateral OTC swaps or trade on bonding-curve AMM pools. Automated premium streaming, oracle-triggered settlements, and multi-pool routing.",
    features: ["Bonding curve AMM pricing", "Oracle-triggered settlement", "Multi-pool routing (PoolRouter)"],
    color: "emerald",
  },
  {
    name: "Nexus",
    subtitle: "Cross-Chain Margin",
    href: "/nexus",
    description:
      "Unified margin engine across Avalanche L1s via ICM/Teleporter. Multi-asset collateral with risk-weighted pricing, cross-chain balance attestations, and permissionless liquidation.",
    features: ["Multi-asset collateral", "Cross-chain attestations", "Permissionless liquidation"],
    color: "purple",
  },
];

const composability = [
  {
    name: "HedgeRouter",
    description: "Atomic invest-and-hedge in a single transaction",
  },
  {
    name: "FlashRebalancer",
    description: "Flash-loan-powered cross-tranche position rebalancing",
  },
  {
    name: "PoolRouter",
    description: "Greedy cheapest-first fill across multiple CDS pools",
  },
  {
    name: "LiquidationBot",
    description: "Full waterfall keeper: oracle > trigger > settle > liquidate",
  },
  {
    name: "YieldVault",
    description: "ERC4626 auto-compounding wrappers for tranche tokens",
  },
  {
    name: "StrategyRouter",
    description: "Multi-vault yield optimization with BPS allocations",
  },
];

const colorMap: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  blue: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    dot: "bg-blue-500",
  },
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  purple: {
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    dot: "bg-purple-500",
  },
};

export default function Home() {
  return (
    <div className="space-y-16 pb-12">
      {/* Hero */}
      <section className="text-center pt-8">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Meridian Protocol
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-2">
          Onchain institutional credit infrastructure on Avalanche
        </p>
        <p className="text-sm text-zinc-500 max-w-xl mx-auto mb-8">
          Structured credit vaults, credit default swap AMMs, and cross-chain margin &mdash; composed into a unified protocol with atomic operations, auto-compounding yield, and permissionless liquidation.
        </p>

        {/* Stats bar */}
        <div className="flex justify-center gap-8 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <Link
            href="/forge"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Launch App
          </Link>
          <Link
            href="/analytics"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700 transition-colors"
          >
            View Analytics
          </Link>
        </div>
      </section>

      {/* Architecture */}
      <section>
        <h2 className="text-center text-sm font-medium text-zinc-500 uppercase tracking-wider mb-6">
          Protocol Architecture
        </h2>
        <div className="max-w-3xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 font-mono text-sm text-zinc-400">
          <div className="border border-zinc-700 rounded-lg p-3 mb-2 text-center">
            <span className="text-yellow-400">YIELD LAYER</span>
            <span className="text-zinc-600"> &mdash; </span>
            YieldVault (ERC4626) | StrategyRouter | LPIncentiveGauge
          </div>
          <div className="border border-zinc-700 rounded-lg p-3 mb-2 text-center">
            <span className="text-orange-400">COMPOSABILITY LAYER</span>
            <span className="text-zinc-600"> &mdash; </span>
            HedgeRouter | PoolRouter | FlashRebalancer | LiqBot
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-blue-500/30 rounded-lg p-3 text-center">
              <div className="text-blue-400 font-bold">FORGE</div>
              <div className="text-xs">Structured Credit</div>
            </div>
            <div className="border border-emerald-500/30 rounded-lg p-3 text-center">
              <div className="text-emerald-400 font-bold">SHIELD</div>
              <div className="text-xs">Credit Default Swaps</div>
            </div>
            <div className="border border-purple-500/30 rounded-lg p-3 text-center">
              <div className="text-purple-400 font-bold">NEXUS</div>
              <div className="text-xs">Cross-Chain Margin</div>
            </div>
          </div>
          <div className="text-center mt-3 text-xs text-zinc-600">
            Avalanche C-Chain + L1 subnets via ICM/Teleporter
          </div>
        </div>
      </section>

      {/* Core Layers */}
      <section>
        <h2 className="text-center text-sm font-medium text-zinc-500 uppercase tracking-wider mb-6">
          Core Protocol Layers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {layers.map((layer) => {
            const c = colorMap[layer.color];
            return (
              <Link
                key={layer.name}
                href={layer.href}
                className={`block border ${c.border} rounded-xl p-6 hover:bg-zinc-900/50 transition-colors group`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <h3 className={`text-lg font-bold ${c.text}`}>{layer.name}</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-3">{layer.subtitle}</p>
                <p className="text-sm text-zinc-400 mb-4">{layer.description}</p>
                <ul className="space-y-1.5">
                  {layer.features.map((f) => (
                    <li key={f} className="text-xs text-zinc-500 flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full ${c.dot} opacity-60`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className={`mt-4 text-xs ${c.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Explore {layer.name} &rarr;
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Composability Grid */}
      <section>
        <h2 className="text-center text-sm font-medium text-zinc-500 uppercase tracking-wider mb-6">
          Composability & Automation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {composability.map((item) => (
            <div
              key={item.name}
              className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/30"
            >
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">{item.name}</h3>
              <p className="text-xs text-zinc-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="text-center">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
          Built With
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            "Solidity 0.8.27",
            "Foundry",
            "OpenZeppelin v5",
            "Avalanche ICM",
            "Next.js",
            "wagmi/viem",
            "RainbowKit",
            "Ponder Indexer",
            "ERC4626",
          ].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 text-xs rounded-full border border-zinc-800 text-zinc-400"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center border-t border-zinc-800 pt-8">
        <p className="text-zinc-500 text-sm mb-4">
          Deployed on Avalanche Fuji Testnet &mdash; connect your wallet to interact with live contracts
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/forge"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Start with Forge
          </Link>
          <Link
            href="/pools"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700 transition-colors"
          >
            Explore CDS Pools
          </Link>
          <Link
            href="/strategies"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700 transition-colors"
          >
            Yield Strategies
          </Link>
        </div>
      </section>
    </div>
  );
}
