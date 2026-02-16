# Meridian — Plain English Guide

> This doc explains what Meridian does in normal language. Use it to prep for the video pitch.
> For technical details, see [PRODUCT.md](PRODUCT.md).

---

## The One-Liner

**Meridian brings Wall Street's credit infrastructure on-chain — tranched lending, credit insurance, cross-chain margin, and AI risk scoring — all composable, all on Avalanche.**

## The 30-Second Version

Global debt markets total $315 trillion. The structured credit slice — CLOs, MBS, ABS — is a $13 trillion market that runs on phone calls, legal documents, and settlement that takes days. DeFi hasn't touched it because it's complex: you need risk layering, insurance products, margin systems, and sophisticated pricing. Meridian builds all of that on-chain as composable smart contracts, using Avalanche-native infrastructure (ICM for cross-chain, eERC for privacy, L1 subnets for isolation).

---

## What Each Layer Actually Does (No Code)

### FORGE — "The Vault Layer"

**Real-world analogy:** A mortgage-backed security (MBS), but on-chain.

Imagine you have a pool of loans generating interest. Instead of everyone getting the same return, you split the pool into three layers:

- **Senior** (safest): Gets paid first. If the loans make money, senior investors get their 5% before anyone else. If loans default, senior loses money last. Think of it like being first in line at the buffet.
- **Mezzanine** (middle): Gets paid after senior. Higher return (10%) but more risk. You only get food after the senior people are done.
- **Equity** (riskiest): Gets whatever's left — could be a lot (15%+) in good times, but you're also first to lose money if things go bad. You eat last, but when there's plenty, your plate is biggest.

This is called **tranching** and it's how most institutional credit actually works. The "waterfall" is the payment order — money flows down from senior to equity, like a waterfall.

**Why it matters:** Different investors have different risk appetites. A pension fund wants the safe senior tranche. A hedge fund wants the high-return equity tranche. Meridian lets them both participate in the same pool with different risk/reward profiles.

### SHIELD — "The Insurance Layer"

**Real-world analogy:** Credit default swaps (CDS) — literally insurance on loans.

Two products here:

**1. OTC Credit Default Swaps (bilateral contracts)**

- Person A thinks a loan pool might default. They buy "protection" — basically insurance.
- Person B thinks the pool is fine. They sell protection and earn premiums.
- If the pool defaults, Person A gets paid from Person B's collateral.
- If nothing happens, Person B keeps the premiums. Free money for being right.

This is exactly how CDS works on Wall Street, except Meridian does it with smart contracts instead of legal agreements and counterparty risk.

**2. CDS AMM Pools (automated market-making)**

Instead of finding a counterparty, you can buy protection from a liquidity pool. The pool uses a **bonding curve** — a math formula that automatically prices protection based on supply and demand:

- When few people are buying protection (low utilization), it's cheap.
- When lots of people are buying (high utilization), price goes up exponentially.
- This creates natural equilibrium — price adjusts automatically, no order book needed.

LPs (liquidity providers) deposit money into the pool and earn premiums from protection buyers. It's like being the insurance company, but automated.

### NEXUS — "The Margin Layer"

**Real-world analogy:** A brokerage margin account, but cross-chain.

When you trade on margin, you post collateral (like stocks or cash) and borrow against it. Nexus does this for Meridian:

- You can post **multiple types of collateral** — USDC, senior tranche tokens, mezzanine tokens, etc.
- Each type has a **risk weight** — USDC counts at 100%, senior tranche tokens at 85%, equity tokens at only 40% (because they're riskier).
- If your collateral value drops below a threshold relative to what you owe, you get **liquidated** — your collateral is seized to cover the debt.

**The cross-chain part:** Avalanche has "L1 subnets" — basically separate blockchains that can talk to each other. Your collateral can live on one chain while your margin account is tracked on another. They communicate via Avalanche's native **ICM/Teleporter** messaging (not a bridge — native Avalanche infrastructure).

**The flywheel:** You invest in a Forge tranche, get tranche tokens, post those tokens as Nexus collateral, borrow against them, invest more. Your capital works harder.

### COMPOSABILITY LAYER — "The Routers"

This is where it gets powerful. These contracts let you do multi-step operations atomically (all-or-nothing, single transaction):

- **HedgeRouter**: "Invest $100K in the senior tranche AND buy insurance on that pool" — one click, one transaction. Without this, you'd need to do two separate transactions and could get front-run between them.

- **PoolRouter**: "Buy $600K of credit protection and split it across the three cheapest pools automatically." It sorts all available pools by price and fills from cheapest to most expensive.

- **FlashRebalancer**: "Move $50K from senior tranche to equity tranche without needing any capital." It flash-borrows money, invests in the target, redeems from the source, and repays — all in one transaction. Zero capital required.

- **LiquidationBot**: The cleanup crew. When credit events happen, this contract runs the full sequence: check oracle, trigger CDS pools, settle payments, liquidate unhealthy margin accounts. Anyone can call it (permissionless), and they earn a 5% fee for doing so.

### YIELD LAYER — "Auto-Pilot Mode"

- **YieldVault**: Wraps a Forge tranche in an auto-compounding vault. You deposit, the vault harvests and reinvests your yield automatically. Your share price goes up over time. Standard ERC4626 (the universal vault standard) — any DeFi aggregator can plug in.

- **StrategyRouter**: "I want 80% in senior and 20% in mezzanine." Define a strategy, allocate capital across multiple yield vaults, rebalance between strategies without manually closing and reopening positions.

- **LPIncentiveGauge**: Bonus rewards for CDS pool LPs. The protocol distributes reward tokens over time, proportional to how much liquidity you're providing.

### AI LAYER — "The Brain"

Four AI contracts that serve as the trusted on-chain interface for off-chain AI models. The critical design principle: **AI proposes, humans approve, smart contracts enforce boundaries.**

- **AIRiskOracle**: AI analyzes market data and publishes credit scores for each vault. These scores directly affect CDS pricing — riskier vaults get wider spreads. Has a **circuit breaker** (score can only change by 10% per update) and **staleness protection** (scores expire after 24 hours). A compromised AI can't crash the system.

- **AIStrategyOptimizer**: AI proposes optimized yield strategies (which vaults, what allocations). But it can't execute them — human governance must approve first. Proposals expire if ignored.

- **AIKeeper**: AI prioritizes which margin accounts to liquidate first during a crisis. Instead of random order, it targets the most dangerous positions first — maximizing recovery for the protocol.

- **AICreditEventDetector**: AI monitors for defaults using market signals. High-confidence detections auto-report; lower-confidence ones go through a **timelock** where governance can veto false positives. Default events (the most severe) ALWAYS go through timelock regardless of confidence.

---

## Why Avalanche Specifically

This isn't chain-agnostic — it's built for Avalanche:

1. **ICM/Teleporter**: Avalanche's native cross-chain messaging. Nexus uses this for margin accounts that span multiple chains. Not a bridge (bridges are security liabilities) — this is built into the Avalanche platform itself.

2. **eERC (Encrypted ERC-20)**: Avalanche's standard for encrypted token balances. Meridian's tranche tokens can be encrypted so nobody can see your position size. The architecture is designed for this — "Minter-Knows" pattern means the vault can still do math internally while external balances are hidden.

3. **L1 Subnets**: Each Avalanche L1 is its own blockchain. NexusVault lives on a separate L1 for isolated collateral custody — if the main chain has issues, your collateral is on its own chain.

4. **Sub-second finality**: Liquidations need to execute fast. Avalanche's consensus gives you that.

---

## The Numbers

| What | How Many |
|------|----------|
| Smart contracts | 35+ core contracts |
| Tests | 692 (all passing, 0 failures) |
| Fuzz tests | 10,000 runs each |
| Frontend pages | 7 fully functional pages |
| Deployed on | Avalanche Fuji (testnet) |
| Lines of Solidity | ~5,500+ |
| Time to build | Solo founder, AI-assisted |

---

## The Competitive Landscape

| Protocol | What They Do | What They're Missing |
|----------|-------------|---------------------|
| **Maple Finance** | Undercollateralized lending pools | No tranching, no hedging, no margin |
| **Goldfinch** | Real-world lending (emerging markets) | No tranching, no CDS, no cross-chain |
| **Centrifuge** | RWA tokenization | No structured credit, no CDS AMM, no margin |
| **Aave/Compound** | Overcollateralized lending | Not credit at all — just collateralized borrowing |
| **Meridian** | Full structured credit stack | Tranching + CDS AMM + cross-chain margin + AI + yield optimization |

Nobody else is building the full stack. They each do one piece. Meridian does all of it, composed together.

---

## Talking Points for the Video

### Opening (use your application energy)
"You know me as a creator — 300K followers, 47 million views, making crypto accessible. What you don't know is I've been architecting systems the entire time. AI tooling just removed the last barrier between vision and execution. This is what I built."

### The Problem (keep it simple)
"Structured credit — CLOs, mortgage-backed securities, ABS — is a $13 trillion market sitting inside a $315 trillion global debt stack. It's the backbone of institutional finance and it's running on phone calls and PDF documents. DeFi has barely touched it because it's complex. Meridian makes it composable."

### The Product (use the layer stack visual)
Walk through the 6-layer diagram. One sentence per layer:
- "Forge structures credit into tranches — senior gets paid first, equity takes first loss."
- "Shield provides credit insurance — automated pricing via bonding curves."
- "Nexus manages margin across chains using Avalanche ICM."
- "Routers compose it all — invest and hedge in one transaction."
- "Yield layer auto-compounds everything."
- "AI layer scores risk, detects defaults, optimizes strategies — with circuit breakers and human veto."

### The Demo (show, don't tell)
- Terminal: `forge test` → 692 passing tests
- Frontend: show the actual UI, click through a vault
- Snowtrace: show deployed contracts on Fuji
- Optional: `forge script script/Demo.s.sol -vv` → narrate the 12-step lifecycle

### The Close
"I didn't come to participate. I came to build the infrastructure that institutional credit needs to move on-chain. 35 contracts, 692 tests, deployed on Fuji, solo-built with AI-assisted development. This is day one."

---

## Concepts Glossary (for reference)

| Term | What It Means |
|------|--------------|
| **Tranche** | A slice of a credit pool with a specific risk/reward profile (senior = safe, equity = risky) |
| **Waterfall** | The payment order — senior gets paid first, losses hit equity first |
| **CDS (Credit Default Swap)** | Insurance on a loan. Buyer pays premiums, gets paid if loan defaults. |
| **Bonding Curve** | A math formula that prices things based on supply/demand — price rises as more people buy |
| **AMM (Automated Market Maker)** | A pool of liquidity with algorithmic pricing — no order book, no counterparty matching |
| **Margin** | Borrowing against collateral. Post $100 of collateral, borrow $60. |
| **Risk Weight** | How much a collateral type "counts." USDC = 100%, risky tokens = less. |
| **Liquidation** | When your collateral value drops too low, it gets seized to cover your debt |
| **ERC4626** | A standard interface for yield-bearing vaults — any DeFi protocol can plug in |
| **ICM/Teleporter** | Avalanche's native cross-chain messaging system (not a bridge) |
| **eERC** | Avalanche's encrypted ERC-20 standard — token balances hidden via encryption |
| **L1 Subnet** | A separate blockchain in the Avalanche ecosystem, with its own validators |
| **Circuit Breaker** | A safety mechanism that limits how much a value can change in one update |
| **Timelock** | A delay before an action executes — gives humans time to review and veto |
| **WAD** | 1e18 (a trillion trillion) — how Solidity represents decimal numbers using integers |
| **BPS (Basis Points)** | 1/100th of a percent. 100 BPS = 1%. Used for rates and fees. |
| **Flash Loan** | Borrow money with zero collateral, but you MUST repay in the same transaction |
| **Fuzz Test** | Testing with random inputs (10,000 random values) to find edge cases |
| **Invariant Test** | Testing that certain properties ALWAYS hold, no matter what actions are taken |
