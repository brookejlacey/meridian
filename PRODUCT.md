# Meridian Protocol — Product Overview

## The Problem

Traditional credit markets — corporate bonds, asset-backed securities, structured credit — are a **$130+ trillion market** that remains almost entirely off-chain. The few DeFi protocols that touch credit (Maple, Goldfinch, Centrifuge) offer simple lending pools with no tranching, no hedging, and no cross-chain capital efficiency. They're essentially unsecured lending with a website.

Meanwhile, institutional credit structuring (CLOs, CDOs, ABS) involves:
- **Tranching**: splitting a credit pool into risk layers (senior gets paid first, equity absorbs losses first)
- **Credit default swaps**: buying/selling insurance against defaults
- **Margin management**: posting collateral across multiple positions and venues
- **Yield optimization**: auto-reinvesting returns, rebalancing across strategies

None of this exists onchain in a composable, unified protocol. Meridian builds all four layers — entirely on Avalanche.

---

## What Meridian Is

Meridian is an **onchain institutional credit protocol on Avalanche** with four composable layers:

```
┌─────────────────────────────────────────────────────────┐
│                    YIELD LAYER                          │
│  YieldVault (ERC4626) │ StrategyRouter │ LPIncentiveGauge│
├─────────────────────────────────────────────────────────┤
│                 COMPOSABILITY LAYER                     │
│  HedgeRouter │ PoolRouter │ FlashRebalancer │ LiqBot    │
├─────────────────────────────────────────────────────────┤
│     FORGE          │     SHIELD       │     NEXUS       │
│  Structured Credit │  Credit Default  │  Cross-Chain    │
│  Vaults + Tranches │  Swaps + AMM     │  Margin Engine  │
└─────────────────────────────────────────────────────────┘
                         │
                    Avalanche C-Chain
                    (+ L1 subnets via ICM)
```

Everything is Solidity 0.8.27, tested with Foundry, deployed on Avalanche Fuji testnet. The protocol uses Avalanche-native technology throughout: ICM/Teleporter for cross-chain messaging, Avalanche L1 subnets for isolated collateral custody, and eERC (encrypted ERC-20s) for position privacy.

---

## Layer 1: Forge — Structured Credit Vaults

### What it does

An originator creates a credit vault (think: a pool of loans). Investors deposit USDC and receive tranche tokens representing their risk position:

- **Senior tranche** (70% allocation, 5% target APR) — gets paid first from yield, loses last in defaults. Lowest risk, lowest return.
- **Mezzanine tranche** (20% allocation, 10% target APR) — middle layer. Absorbs losses after equity is wiped.
- **Equity tranche** (10% allocation, 15% target APR) — gets whatever's left after senior and mezz are paid. Highest risk, highest return. Absorbs first losses.

### The Waterfall

When yield arrives (weekly), `WaterfallDistributor` distributes it with strict seniority:
1. Pay senior tranche their target yield first
2. If anything remains, pay mezzanine
3. Whatever's left goes to equity

If there's a loss event, it's the reverse — equity absorbs losses first, then mezzanine, then senior.

### Key Mechanics

- `ForgeFactory.createVault()` deploys a new vault with configurable tranche parameters
- `ForgeVault.invest(trancheId, amount)` deposits USDC, mints tranche tokens
- `ForgeVault.triggerWaterfall()` distributes accumulated yield (time-gated, weekly)
- `ForgeVault.claimYield(trancheId)` — pull-based, investors claim their own yield
- `ForgeVault.withdraw(trancheId, amount)` — burns tranche tokens, returns USDC
- `investFor(trancheId, amount, beneficiary)` — router-compatible: caller pays, beneficiary owns

### Privacy Layer (designed, simulated)

Each tranche token can be an `EncryptedTrancheToken` using Avalanche's eERC standard — positions are encrypted on-chain using ElGamal encryption. Only the holder (and designated auditors) can see balances. The vault uses a "Minter-Knows" pattern: it keeps plaintext share mirrors internally for waterfall math, while the external token view is encrypted. Transfer hooks sync the mirrors on secondary trades.

---

## Layer 2: Shield — Credit Default Swaps

Two systems provide credit protection:

### CDS Contracts (OTC-style)

A bilateral credit default swap where:
- A **protection seller** posts collateral (100% of notional)
- A **protection buyer** pays streaming premiums (notional x spread x time)
- If a **credit event** occurs (reported by `CreditEventOracle`), the buyer gets paid from the seller's collateral
- If the contract **expires** without event, the seller keeps earned premiums and gets collateral back

`ShieldPricer` quotes indicative spreads: `spread = base + riskPremium + utilizationPremium + tenorPremium + statusPenalty`, capped at a maximum.

### CDS AMM Pools (automated market-making)

`CDSPool` is an automated market maker for credit protection using a **bonding curve pricing model**:

```
spread = baseSpread + slope * u^2 / (1 - u)
```

where `u` = utilization (protection sold / total liquidity). This creates:
- Low spreads when utilization is low (cheap protection, incentivizes buying)
- Exponentially rising spreads as utilization increases (natural supply/demand equilibrium)
- Hard cap at 95% utilization (safety margin)

**LPs deposit USDC** and get LP shares. **Protection buyers** pay premiums that accrue to LP share value. LPs earn yield from premiums proportional to their share of the pool.

Premium integration uses **trapezoidal approximation** (N=10 steps) over the bonding curve to accurately price the cost of moving utilization from `u_before` to `u_after`.

The pool handles the full lifecycle: deposit, buy protection, premium accrual, credit event trigger, settlement (with configurable recovery rate), and expiry.

---

## Layer 3: Nexus — Cross-Chain Margin Engine

The margin engine that ties everything together, designed for Avalanche's multi-chain architecture:

- **NexusHub** (C-Chain): Central margin accounting. Tracks multi-asset collateral positions, computes risk-weighted margin ratios, triggers liquidations.
- **NexusVault** (L1 subnet): Custodies actual collateral on a separate Avalanche L1. Sends balance attestations to the Hub via ICM/Teleporter.
- **CollateralOracle**: Asset pricing + tier-based risk weights (Senior tranche tokens: 85% weight, Mezzanine: 60%, Equity: 40%, USDC: 100%)
- **MarginAccount** library: Pure math for margin ratio, health checks, shortfall calculation, liquidation penalty, max withdrawable

### Cross-Chain Flow

1. User deposits collateral into NexusVault on L1
2. NexusVault sends a Teleporter message to NexusHub: "user X has Y collateral"
3. NexusHub updates the margin account with risk-weighted collateral value
4. User can now take positions (borrow, trade CDS) against their margin
5. If margin ratio drops below threshold, liquidation is triggered

This means **Forge tranche tokens are first-class collateral**. A senior tranche token with 85% risk weight is almost as good as USDC for margin purposes. This creates a flywheel: invest in Forge, use tranche tokens as Nexus collateral, borrow against them, invest more.

---

## Composability Layer — Routers & Keepers

This is where Meridian's architecture becomes powerful — atomic multi-protocol operations:

### HedgeRouter

Composes Forge + Shield in one transaction:
```
investAndHedge(vaultAddr, trancheId, investAmount, cdsAddr, hedgeAmount, maxPremium)
```
Atomically: invest USDC into a tranche, then buy CDS protection on the same vault. One tx, one approval. The `*For()` beneficiary pattern solves the `msg.sender` problem — the router calls `investFor()` and `buyProtectionFor()`, pulling tokens from the user but assigning ownership to them.

### PoolRouter

Multi-pool protection routing with a **greedy cheapest-first algorithm**:
1. Query all registered CDS pools for the reference asset
2. Sort by current spread (insertion sort, max 10 pools)
3. Fill protection starting with the cheapest pool
4. Binary search to find exact amount that fits within budget per pool
5. Split large orders across multiple pools for best execution

### FlashRebalancer

Atomic cross-tranche rebalancing using flash loans:
```
rebalance(vault, fromTranche, toTranche, amount)
```
Flash borrow USDC, invest in target tranche, transfer source tranche tokens to rebalancer, withdraw source, repay flash loan. Zero capital required, single transaction.

### LiquidationBot

Permissionless keeper contract for the full liquidation waterfall:
```
executeWaterfall(oracleAddr, vaultAddr, poolFactoryAddr, accounts)
```
Oracle check, trigger all CDS pools, settle triggered pools, liquidate unhealthy margin accounts. Anyone can call it, incentivized by liquidation penalties (5% of shortfall).

---

## Yield Layer — Auto-Compounding & Strategy Optimization

The newest layer, making structured credit positions "set and forget":

### YieldVault (ERC4626)

Each `YieldVault` wraps a specific ForgeVault tranche (e.g., "Auto-Compounding Senior"). Users deposit USDC, the vault invests in the tranche, and a keeper calls `compound()` periodically:

```
compound() -> claimYield(trancheId) -> investFor(trancheId, claimed, address(this))
```

Yield is harvested and reinvested automatically. Share price appreciates over time. Standard ERC4626 — compatible with any aggregator, wallet, or DeFi protocol that speaks the vault standard.

### StrategyRouter

Governance creates named strategies with configurable allocations:
- **Conservative**: 80% Senior YieldVault + 20% Mezzanine YieldVault
- **Balanced**: 50% Senior + 30% Mezzanine + 20% Equity
- **Aggressive**: 30% Mezzanine + 70% Equity

Users `openPosition(strategyId, amount)` and capital is automatically split across the YieldVaults. `rebalance(positionId, newStrategyId)` atomically moves from one strategy to another — no need to manually close and reopen.

### LPIncentiveGauge

Synthetix StakingRewards-style liquidity mining for CDS pool LPs. Governance funds the gauge with reward tokens over a duration, and LPs earn proportional to their pool shares over time. Completely external — reads `pool.sharesOf()` directly, no pool modifications needed.

---

## The Full Flywheel

Here's how it all composes for an institutional user:

1. **Originator** creates a structured credit vault via ForgeFactory
2. **Investor** deposits USDC via `HedgeRouter.investAndHedge()` — atomically gets senior tranche exposure + CDS protection
3. **LP** deposits USDC into CDSPool, earns premium yield + gauge rewards from LPIncentiveGauge
4. **Investor** deposits tranche tokens as collateral in NexusHub (85% risk weight for senior)
5. **Investor** borrows against margin to take more positions
6. **YieldVault** auto-compounds tranche yield, share price rises
7. **StrategyRouter** lets investor rebalance across risk profiles without unwinding
8. If credit event occurs: Oracle triggers, CDS pools settle, margin accounts liquidated, waterfall distributes recovery
9. **LiquidationBot** executes the full sequence permissionlessly

---

## Why It's Novel

### 1. First composable structured credit stack on any chain
No protocol combines tranching + CDS + cross-chain margin + auto-compounding in a single composable system. Maple does lending. Goldfinch does pools. Centrifuge does RWA. None do structured credit with waterfall priority, hedging, and margin.

### 2. Avalanche-native architecture
- **ICM/Teleporter** for cross-chain margin (not bridges — native Avalanche interchain messaging)
- **eERC encrypted tokens** for position privacy (Avalanche's encrypted ERC-20 standard)
- **Avalanche L1 subnets** for isolated collateral custody (NexusVault on its own chain)
- Designed for Avalanche's **sub-second finality** — critical for liquidation execution

### 3. ERC4626 composability throughout
YieldVaults are standard ERC4626. Any protocol, aggregator, or wallet that speaks ERC4626 can integrate. Yearn, Beefy, or any yield aggregator could plug in directly.

### 4. Bonding curve CDS pricing
No existing DeFi CDS protocol uses automated market-making with continuous pricing. Meridian's bonding curve creates natural supply/demand equilibrium for credit protection — spreads rise as utilization increases, creating self-regulating markets.

### 5. Atomic multi-protocol operations
HedgeRouter, PoolRouter, FlashRebalancer — these aren't just convenience wrappers. They enable operations that would be impossible with manual multi-tx flows (flash rebalancing requires atomicity, routed fills need consistent pricing within a single block).

### 6. Privacy by design
The four-zone architecture and Minter-Knows pattern mean the protocol works identically in plaintext mode (current) and encrypted mode (when eERC infrastructure is ready). No architectural changes needed — just swap `TrancheToken` for `EncryptedTrancheToken`.

### 7. Institutional-grade risk management
Tier-based risk weights, cross-chain margin, automated liquidation cascades, credit event oracles with threshold-based auto-triggering — this is modeled on how institutional credit actually works, not simplified DeFi lending.

---

## Technical Stats

| Metric | Value |
|--------|-------|
| Solidity contracts | 26 (core) + mocks + interfaces |
| Test coverage | 378 tests (0 failures) |
| Fuzz test depth | 10,000 runs per fuzz test |
| Invariant tests | 3 properties, 256 runs each, ~3,840 calls |
| Gas optimization | 911,671 gas saved via unchecked blocks |
| Frontend pages | 7 (Forge, Shield, Pools, Nexus, Strategies, Analytics, Home) |
| wagmi hooks | 12 |
| Indexer handlers | 7 event handler files |
| Demo script | 12-step end-to-end lifecycle walkthrough |
| Deploy scripts | 3 (DeployFuji, DeployPhase5, DeployHedgeRouter) |
| Lines of Solidity | ~4,500+ |
| Deployed on | Avalanche Fuji (C-Chain), block 51648911 |

### Gas Benchmarks

| Operation | Gas | Notes |
|-----------|-----|-------|
| invest() | ~208k | ForgeVault tranche investment |
| claimYield() | ~660k | Pull-based yield claim |
| triggerWaterfall() | ~632k | Senior-priority yield distribution |
| withdraw() | ~423k | Burn tranche tokens, return USDC |
| investAndHedge() | ~476k | Atomic invest + CDS protection |
| buyProtection() | ~377k | CDSPool bonding curve purchase |
| compound() | ~483k | YieldVault auto-compound |
| openPosition() | ~905k | StrategyRouter multi-vault allocation |
| deposit() (CDSPool LP) | ~130k | Provide CDS liquidity |

---

## Architecture Deep Dive

### Four-Zone Privacy Model

| Zone | What Lives Here | Visibility |
|------|----------------|------------|
| Zone 1: Public Global | Pool params, oracle prices, aggregate metrics | Everyone |
| Zone 2: Private Internal | Per-user share counts, yield accumulators, margin state | Contract only |
| Zone 3: Encrypted External | eERC token balances (ElGamal encrypted) | Holder + auditor |
| Zone 4: Private Off-Chain | User BabyJubJub keys, decrypted balances | User only |

Currently operating in Zone 1+2 (plaintext). Zone 3+4 activate when eERC infrastructure is integrated — zero architectural changes required.

### Key Design Patterns

- **Minter-Knows**: Vault mints tranche tokens, inherently knows share counts, keeps plaintext mirror for waterfall math. eERC provides encrypted external view.
- **Pull-based yield**: Users call `claimYield()`. Internal `_settleYield()` only accumulates — never transfers. Gas cost borne by claimant.
- **Beneficiary pattern**: `investFor()` and `buyProtectionFor()` let routers act on behalf of users. Tokens pulled from `msg.sender`, ownership assigned to `beneficiary`.
- **Factory pattern**: `ForgeFactory`, `ShieldFactory`, `CDSPoolFactory`, `YieldVaultFactory` — consistent deployment and tracking across all protocol components.
- **Waterfall distribution**: `WaterfallDistributor` library handles senior-priority yield and equity-first loss absorption as pure math.
- **Bonding curve AMM**: Continuous pricing via `spread = base + slope * u^2 / (1-u)` with trapezoidal integration for premium quotes.
- **Gas optimization**: `unchecked` blocks on all safe arithmetic in MeridianMath, BondingCurve hot loops, and all loop counters across the protocol.

### Deployed Addresses (Fuji Testnet)

| Contract | Address |
|----------|---------|
| ForgeFactory | `0x52614038F825FbA5BE78ECf3eA0e3e0b21961d29` |
| ShieldFactory | `0x9A9e51c6A91573dEFf7657baB7570EF4888Aaa3A` |
| NexusHub | `0xE6bb9535bd754A993dc04E83279f92980F7ad9F4` |
| HedgeRouter | `0x736fE313dEff821b71d1c2334DA95cC0eFf0B98c` |
| MockUSDC | `0x09eC69338406B293b3f6Aa775A65C1FA7C0bC42f` |
| Deployer | `0xD243eB302C08511743B0050cE77c02C80FeccCc8` |

Phase 5 contracts (CDSPoolFactory, PoolRouter, FlashRebalancer, LiquidationBot, YieldVaultFactory, StrategyRouter, LPIncentiveGauge) have deploy scripts ready — run `forge script script/DeployPhase5.s.sol --rpc-url fuji --broadcast` to deploy.

---

## File Map

| Area | Key Files |
|------|-----------|
| Forge core | `src/forge/ForgeVault.sol`, `src/forge/ForgeFactory.sol`, `src/forge/TrancheToken.sol` |
| Shield core | `src/shield/CDSContract.sol`, `src/shield/ShieldFactory.sol`, `src/shield/ShieldPricer.sol` |
| CDS AMM | `src/shield/CDSPool.sol`, `src/shield/CDSPoolFactory.sol`, `src/libraries/BondingCurve.sol` |
| Nexus core | `src/nexus/NexusHub.sol`, `src/nexus/NexusVault.sol`, `src/nexus/CollateralOracle.sol` |
| Routers | `src/HedgeRouter.sol`, `src/PoolRouter.sol`, `src/FlashRebalancer.sol` |
| Keeper | `src/LiquidationBot.sol` |
| Yield | `src/yield/YieldVault.sol`, `src/yield/YieldVaultFactory.sol`, `src/yield/StrategyRouter.sol`, `src/yield/LPIncentiveGauge.sol` |
| Libraries | `src/libraries/MeridianMath.sol`, `src/libraries/WaterfallDistributor.sol`, `src/libraries/PremiumEngine.sol`, `src/libraries/MarginAccount.sol`, `src/libraries/BondingCurve.sol` |
| Interfaces | `src/interfaces/` (IForgeVault, ICDSPool, INexusHub, IYieldVault, etc.) |
| Mocks | `src/mocks/` (MockEERC, MockTeleporter, MockOracle, MockYieldSource, MockFlashLender) |
| Privacy | `src/forge/EncryptedTrancheToken.sol` |
| Tests | `test/forge/`, `test/shield/`, `test/nexus/`, `test/yield/`, `test/invariants/` |
| Deploy | `script/DeployFuji.s.sol`, `script/DeployPhase5.s.sol`, `script/DeployHedgeRouter.s.sol` |
| Demo | `script/Demo.s.sol` (12-step end-to-end walkthrough) |
| Frontend | `frontend/src/app/` (7 pages), `frontend/src/hooks/` (12 hooks) |
| Indexer | `indexer/src/` (7 handler files), `indexer/ponder.config.ts` |

---

## Build & Run

```bash
# Contracts
forge build                              # Compile all contracts
forge test                               # Run all 378 tests
forge test --match-contract <Name> -vv   # Specific test suite
forge script script/Demo.s.sol -vv       # Run 12-step E2E demo

# Frontend
cd frontend && npm run build             # Build Next.js app
cd frontend && npm run dev               # Dev server (localhost:3000)

# Indexer
cd indexer && pnpm dev                   # Ponder indexer (localhost:42069)

# Deploy
forge script script/DeployFuji.s.sol --rpc-url fuji --broadcast      # Phase 1 (core)
forge script script/DeployPhase5.s.sol --rpc-url fuji --broadcast    # Phase 5 (AMM + yield)
```

---

## E2E Demo Walkthrough

`forge script script/Demo.s.sol -vv` runs a complete 12-step protocol demonstration:

| Step | What Happens |
|------|-------------|
| 1 | Deploy all infrastructure (USDC, oracles, factories, routers, keeper) |
| 2 | Create structured credit vault with 3 tranches (Senior 5%, Mezz 10%, Equity 15%) |
| 3 | Alice invests 700k Senior, Bob 200k Mezz, Charlie 100k Equity |
| 4 | Generate 50k yield, waterfall distributes: Senior first, Equity gets residual |
| 5 | Create two CDS AMM pools (2% and 4% base spreads), Alice provides LP liquidity |
| 6 | Bob buys 600k protection via PoolRouter — splits across both pools automatically |
| 7 | Credit event triggers, LiquidationBot settles all pools at 50% recovery |
| 8 | Alice flash-rebalances 50k from Senior to Equity atomically (zero capital) |
| 9 | Charlie opens margin account, gets liquidated when obligation makes position unhealthy |
| 10 | YieldVault: Alice deposits 500k, yield generated, compound auto-reinvests, share price rises |
| 11 | StrategyRouter: Bob opens Conservative position, rebalances to Aggressive, closes with full value |
| 12 | LPIncentiveGauge: LPs earn MRD rewards proportional to share holdings over time |
