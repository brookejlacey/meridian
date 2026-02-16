# Meridian Protocol

> **Avalanche BUIDL Games Submission** | Onchain Institutional Credit Infrastructure
>
> 35+ smart contracts | 692 tests (10k fuzz runs) | 6 composable protocol layers | Deployed on Fuji
>
> Structured credit + CDS AMMs + cross-chain margin + AI risk oracles -- composed with atomic routers, auto-compounding yield, and permissionless liquidation

---

Onchain institutional credit protocol on Avalanche. Six composable layers:

- **Forge** -- Structured credit vaults with senior/mezzanine/equity tranches and waterfall yield distribution
- **Shield** -- Credit default swaps (bilateral OTC + automated market maker with bonding curve pricing)
- **Nexus** -- Cross-chain margin engine with multi-asset collateral and liquidation via ICM/Teleporter
- **Composability** -- HedgeRouter, PoolRouter, FlashRebalancer, LiquidationBot for atomic multi-protocol operations
- **Yield** -- ERC4626 auto-compounding YieldVaults, multi-strategy StrategyRouter, LP incentive gauges
- **AI** -- AIRiskOracle, AIStrategyOptimizer, AIKeeper, AICreditEventDetector with circuit breakers, timelocks, and governance veto

Built with Foundry (Solidity 0.8.27), Next.js 16, wagmi/viem, and Ponder indexer. **692 tests, 0 failures.**

See [PRODUCT.md](PRODUCT.md) for a comprehensive product overview.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      AI LAYER                           │
│  AIRiskOracle │ AIStrategyOptimizer │ AIKeeper │ Detector│
├─────────────────────────────────────────────────────────┤
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

### Quick Start (Hackathon Judges)

1. **Try the live app**: Connect wallet to Fuji, click "Faucet 100k USDC" in the header, then invest in a tranche
2. **Run the demo script**: `forge script script/Demo.s.sol -vv` -- walks through the entire 12-step protocol lifecycle
3. **Run all tests**: `forge test` -- 692 tests including 10k-run fuzz tests and invariant tests
4. **Read the product doc**: [PRODUCT.md](PRODUCT.md) for the full vision and technical deep dive

### Four-Zone Privacy Model

| Zone | Data | Visibility |
|------|------|-----------|
| Zone 1 | Pool params, oracle prices, aggregates | Public |
| Zone 2 | Per-user shares, yield accumulators | Contract storage (private) |
| Zone 3 | eERC encrypted token balances | Holder + auditor only |
| Zone 4 | BabyJubJub keys, decrypted balances | Off-chain only |

Currently operating in plaintext (Zone 1+2) with MockEERC. Real eERC integration is a future milestone.

## Deployed Contracts (Avalanche Fuji)

**Phase 1 (Core)**

| Contract | Address |
|----------|---------|
| ForgeFactory | `0x52614038F825FbA5BE78ECf3eA0e3e0b21961d29` |
| ForgeVault #0 | `0x658b99C350CfEDd8Acf33dB6782Ca99e44e98327` |
| ShieldFactory | `0x9A9e51c6A91573dEFf7657baB7570EF4888Aaa3A` |
| CDS #0 | `0x35d6fE4079400d4f0D3155ea7220D3279D3C7914` |
| NexusHub | `0xE6bb9535bd754A993dc04E83279f92980F7ad9F4` |
| NexusVault | `0x3BEd1a1fB4B918d0a9dA2e3C3FD8A128964F77a3` |
| HedgeRouter | `0x736fE313dEff821b71d1c2334DA95cC0eFf0B98c` |
| ShieldPricer | `0x31DBEe51017EB6Cf4f536a43408F072339b5c83F` |
| CreditEventOracle | `0x8E28b5C0fc6053F70dB768Fa9F35a3a8a3f35175` |
| CollateralOracle | `0x6323948435A6CF7553fB69840EdD07f1ab248eb3` |
| MockUSDC (YieldSource) | `0x09eC69338406B293b3f6Aa775A65C1FA7C0bC42f` |
| MockTeleporter | `0xbedC513fFB99b130cD0292785Ce2EE6B04BF9C3b` |
| Senior Token | `0xF79f923E14c7821343BC956e9bc668E69C5b5a8B` |
| Mezzanine Token | `0xE9Fb0830288E40030E0616bC49a3d680ea64d450` |
| Equity Token | `0x1E9d746ba44a7697ddFBfeB79FEA5DFc0d103848` |

**Phase 5 (AMM + Yield)**

| Contract | Address |
|----------|---------|
| CDSPoolFactory | `0xEc82dd21231dAcbA07f1C4F06B84Cf7bc6b4C24c` |
| CDSPool #0 | `0x836E1a9ed6700A314433642E3052B6C5AA2251cE` |
| PoolRouter | `0x11fA2536c30A1D86A227Cf944dCb364475B57c5F` |
| FlashRebalancer | `0xfAce2130a5B8b1B562241F2A3d86Ee8ca6DDA28E` |
| LiquidationBot | `0x069B3ef3631e65E8C2561761D15DC7F39CA4A558` |
| YieldVaultFactory | `0x2F08A87D18298dF9A795a941cf493a602a9ea68C` |
| YieldVault Senior | `0x9089841A30c4CC67E9E12fBc25b42aFdE21565E8` |
| YieldVault Mezzanine | `0x3Ddf4A20C17F0edb24b2b2681B57F1b9b13a77d4` |
| YieldVault Equity | `0x34fc8f840b95766765CC03Ec52ab27A4B9A53976` |
| StrategyRouter | `0x77460e30eb08d42089eaF34b5e6FFE006a933984` |
| LPIncentiveGauge | `0xCc1187994962410Abf4B6721b27267eA6afd0724` |
| RewardToken (MRD) | `0x8bDeE2C648F15F6481153698DCD1BE81bC46FAe3` |
| MockFlashLender | `0x87c9C2E758702E74AB7a4E17de1A911B58688AAA` |

**AI Layer**

| Contract | Address |
|----------|---------|
| AIRiskOracle | `0x59Bd5E0b5B80908EA28dBE7F37661FD51f5E9C1E` |
| AIStrategyOptimizer | `0xc94FeB8e9f7841c0120A5e9c9fd7218A54233c3F` |
| AIKeeper | `0xbd3728cC67EA0c8dC339C17b6a6474e85064045D` |
| AICreditEventDetector | `0x684471eE3335BD66f1364cE053085FbA57250084` |

**Deployer**: `0xD243eB302C08511743B0050cE77c02C80FeccCc8`
**Deployment block**: `51648911`
**Chain**: Avalanche Fuji C-Chain (43113)

## Project Structure

```
meridian/
├── src/
│   ├── forge/              # Structured credit layer
│   │   ├── ForgeFactory.sol
│   │   ├── ForgeVault.sol
│   │   ├── TrancheToken.sol
│   │   └── EncryptedTrancheToken.sol
│   ├── shield/             # CDS / risk layer
│   │   ├── CDSContract.sol
│   │   ├── CDSPool.sol          # AMM pool with bonding curve
│   │   ├── CDSPoolFactory.sol
│   │   ├── ShieldFactory.sol
│   │   ├── ShieldPricer.sol
│   │   └── CreditEventOracle.sol
│   ├── nexus/              # Cross-chain margin layer
│   │   ├── NexusHub.sol
│   │   ├── NexusVault.sol
│   │   └── CollateralOracle.sol
│   ├── yield/              # Auto-compounding & strategy layer
│   │   ├── YieldVault.sol       # ERC4626 auto-compounder
│   │   ├── YieldVaultFactory.sol
│   │   ├── StrategyRouter.sol   # Multi-vault optimizer
│   │   └── LPIncentiveGauge.sol # Synthetix-style LP rewards
│   ├── libraries/          # Pure math libraries
│   │   ├── MeridianMath.sol
│   │   ├── WaterfallDistributor.sol
│   │   ├── BondingCurve.sol
│   │   ├── PremiumEngine.sol
│   │   └── MarginAccount.sol
│   ├── ai/                 # AI-powered protocol automation
│   │   ├── AIRiskOracle.sol        # Credit scoring with circuit breaker
│   │   ├── AIStrategyOptimizer.sol # Governance-gated strategy proposals
│   │   ├── AIKeeper.sol            # Prioritized liquidation ordering
│   │   └── AICreditEventDetector.sol # Default detection with timelock/veto
│   ├── HedgeRouter.sol     # Atomic invest + hedge
│   ├── PoolRouter.sol      # Multi-pool CDS routing
│   ├── FlashRebalancer.sol # Flash loan tranche rebalancing
│   ├── LiquidationBot.sol  # Permissionless keeper
│   ├── interfaces/         # IForgeVault, ICDSPool, INexusHub, IYieldVault, IAIRiskOracle, etc.
│   └── mocks/              # MockEERC, MockTeleporter, MockOracle, MockYieldSource, MockFlashLender
├── test/
│   ├── forge/              # 47 vault + waterfall + encrypted tranche tests
│   ├── shield/             # 73 CDS + oracle + pricer + factory + 53 pool tests
│   ├── nexus/              # 68 hub + vault + oracle + margin tests
│   ├── yield/              # 57 yield vault + strategy + gauge + integration tests
│   ├── ai/                 # 75 AI component tests + 5 integration tests
│   ├── invariants/         # CDSPool invariant tests
│   └── *.t.sol             # HedgeRouter, PoolRouter, FlashRebalancer, LiquidationBot tests
├── script/
│   ├── DeployFuji.s.sol          # Phase 1 full protocol deployment
│   ├── DeployPhase5.s.sol        # Phase 5 AMM + yield layer deployment
│   ├── DeployHedgeRouter.s.sol   # HedgeRouter incremental deploy
│   ├── DeployAI.s.sol            # AI layer deployment (4 contracts)
│   └── Demo.s.sol                # 12-step E2E protocol walkthrough
├── frontend/               # Next.js 16 + wagmi + RainbowKit
│   ├── src/app/            # 7 pages: forge, shield, pools, nexus, strategies, analytics
│   ├── src/components/     # VaultCard, CDSCard, HedgePanel, StrategyCard, etc.
│   ├── src/hooks/          # 12 wagmi hooks + indexer hooks
│   └── src/lib/            # ABIs, GraphQL client, utils
├── indexer/                # Ponder v0.14 event indexer
│   ├── src/                # 7 event handler files
│   ├── abis/               # Contract ABIs
│   ├── ponder.config.ts    # Chain + contract config
│   └── ponder.schema.ts    # 14 tables, 3 enums
├── encrypted-erc/          # Ava Labs EncryptedERC (reference)
├── PRODUCT.md              # Comprehensive product overview
├── backlog.md              # Architecture notes + remaining work
└── foundry.toml            # Solc 0.8.27, 10k fuzz runs
```

## Development Setup

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast)
- Node.js 18+ and npm
- pnpm (for indexer)

### Smart Contracts

```bash
# Build
forge build

# Run all tests (692 tests, including 10k-run fuzz tests)
forge test

# Run specific test suite
forge test --match-contract CDSPoolTest -vv

# Run 12-step E2E demo
forge script script/Demo.s.sol -vv

# Gas snapshot
forge snapshot
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build        # Production build
```

Requires `frontend/.env.local` with contract addresses (already configured for Fuji).

### Indexer

```bash
cd indexer
pnpm install
pnpm dev             # http://localhost:42069 (GraphQL playground)
```

Requires `indexer/.env.local` with `PONDER_RPC_URL_43113` (already configured for Fuji).

### Deploying

```bash
# Phase 1: Core protocol (Forge, Shield, Nexus, HedgeRouter)
forge script script/DeployFuji.s.sol --rpc-url fuji --broadcast

# Phase 5: AMM pools, composability routers, yield layer
forge script script/DeployPhase5.s.sol --rpc-url fuji --broadcast
```

Requires `.env` with `DEPLOYER_PRIVATE_KEY`.

## Test Coverage

| Suite | Tests | Key Coverage |
|-------|-------|-------------|
| ForgeVault + Waterfall | 47 | invest, withdraw, yield claim, waterfall distribution |
| EncryptedTrancheToken | 28 | eERC simulation, hook overrides, vault integration |
| Shield (CDS+Oracle+Pricer+Factory) | 73 | Full CDS lifecycle, premium accrual, spread pricing |
| CDSPool AMM | 53 | Bonding curve, LP deposits, protection, settlement, invariants |
| Nexus (Hub+Vault+Oracle+Margin) | 68 | Margin accounts, collateral, liquidation, cross-chain |
| HedgeRouter | 19 | Atomic hedge, refund, create+hedge, fuzz |
| PoolRouter | 8 | Multi-pool routing, cheapest-first, budget fits |
| FlashRebalancer | 8 | Atomic rebalance, flash loan mechanics |
| LiquidationBot | 14 | Waterfall execution, batch liquidation |
| YieldVault + Factory | 19 | ERC4626 deposit/withdraw, compound, share price |
| StrategyRouter | 16 | Strategy CRUD, position open/close/rebalance, fuzz |
| LPIncentiveGauge | 19 | Reward distribution, proportional earnings, claim |
| Yield Integration | 3 | E2E compound, strategy rebalance, gauge rewards |
| Invariant Tests | 3 | CDSPool solvency, zombie shares, utilization cap |
| AI (Risk+Strategy+Keeper+Detector) | 75 | Circuit breakers, timelocks, veto, rate limiting, integration |
| AI Integration | 5 | Cross-component: risk->pricing, detect->oracle, safety nets |
| Access Control Hardening | ~239 | Two-step ownership, role authorization, boundary checks |
| **Total** | **692** | 10,000-run fuzz tests on all critical paths |

## Gas Benchmarks

| Operation | Gas |
|-----------|-----|
| invest() | ~208k |
| claimYield() | ~660k |
| triggerWaterfall() | ~632k |
| withdraw() | ~423k |
| investAndHedge() | ~476k |
| buyProtection() (CDSPool) | ~377k |
| compound() (YieldVault) | ~483k |
| openPosition() (StrategyRouter) | ~905k |
| deposit() (CDSPool LP) | ~130k |

Gas optimization pass saved 911,671 gas across the test suite via `unchecked` blocks in hot-path arithmetic.

## Key Design Patterns

- **Pull-based yield** (MasterChef pattern) -- users claim their own yield, pay own gas
- **Minter-Knows** -- vault keeps plaintext mirrors, eERC for external privacy
- **Beneficiary pattern** -- `investFor()`/`buyProtectionFor()` enable router composability
- **Bonding curve AMM** -- `spread = base + slope * u^2 / (1-u)` for CDS pricing
- **Factory pattern** -- ForgeFactory, ShieldFactory, CDSPoolFactory, YieldVaultFactory
- **ERC4626 composability** -- YieldVaults wrap tranches with standard vault interface
- **Synthetix StakingRewards** -- LPIncentiveGauge for CDSPool LP mining
- **AI oracle pattern** -- Off-chain AI computes, on-chain contracts store/route, circuit breakers + timelocks guard execution
