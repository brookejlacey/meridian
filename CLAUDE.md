# CLAUDE.md - Meridian Protocol

## What is this project?

Meridian is an onchain institutional credit protocol on Avalanche with three layers:
- **Forge**: Structured credit vaults (senior/mezzanine/equity tranches, waterfall yield)
- **Shield**: Credit default swaps (premium streaming, oracle triggers, settlement)
- **Nexus**: Cross-chain margin engine (multi-asset collateral, liquidation)
- **HedgeRouter**: Composes Forge + Shield into atomic invest-and-hedge transactions
- **CDS AMM**: Bonding curve-priced automated market maker for credit default swaps (CDSPool + CDSPoolFactory)
- **PoolRouter**: Multi-pool protection routing with greedy cheapest-first fill algorithm
- **FlashRebalancer**: Atomic cross-tranche position rebalancing using flash loans
- **LiquidationBot**: Permissionless keeper with full waterfall execution (oracle → trigger → settle → liquidate)
- **YieldVault**: ERC4626 auto-compounding wrapper for ForgeVault tranches with keeper-callable `compound()`
- **StrategyRouter**: Multi-vault yield optimizer with governance-defined BPS allocation strategies
- **LPIncentiveGauge**: Synthetix StakingRewards-style liquidity mining for CDSPool LPs

All contracts are Solidity 0.8.27, tested with Foundry, deployed on Avalanche Fuji testnet.

## Build & Test

```bash
forge build                              # Compile all contracts
forge test                               # Run all 378 tests (includes 10k-run fuzz + invariants)
forge test --match-contract <Name> -vv   # Run specific test suite with verbosity
cd frontend && npm run build             # Build Next.js frontend
cd indexer && pnpm dev                   # Start Ponder indexer (localhost:42069)
```

## Conventions

- Solidity 0.8.27 with OpenZeppelin v5 (`@openzeppelin/contracts/`)
- WAD math (1e18) for all token amounts, BPS (10_000) for rates/percentages
- `MeridianMath` library for WAD operations (`wadMul`, `wadDiv`, `min`, `max`)
- `PremiumEngine` library for CDS premium calculations
- `WaterfallDistributor` library for senior-priority yield distribution
- `MarginAccount` library for margin ratio and health calculations
- All amounts stored as `uint256` with 18 decimals unless noted
- Tests use `assertApproxEqRel` with 1e15 tolerance for WAD rounding in fuzz tests
- Factory pattern: `ForgeFactory.createVault()`, `ShieldFactory.createCDS()`
- Interfaces prefixed with `I` in `src/interfaces/`
- Mocks prefixed with `Mock` in `src/mocks/`

## Architecture Notes

- **Four-Zone Model**: Zone 1 (public aggregates), Zone 2 (private contract state), Zone 3 (eERC encrypted), Zone 4 (off-chain keys). Currently operating in Zone 1+2 only.
- **Minter-Knows pattern**: ForgeVault keeps plaintext share mirrors (`_shares` mapping) for waterfall math. eERC provides encrypted external view. Transfer hook syncs mirrors on secondary trades.
- **Pull-based yield**: Users call `claimYield()` to claim. `_settleYield()` only accumulates pending yield -- it does NOT transfer tokens.
- **CDS AMM bonding curve**: `spread = baseSpread + slope * u^2 / (1 - u)` where u = utilization. Higher pool utilization → higher protection cost → natural supply/demand equilibrium. LP shares appreciate as premiums accrue (ERC4626-style). 95% max utilization cap.
- **Multi-pool routing**: PoolRouter sorts pools by current spread, greedily fills from cheapest. Handles large orders that span multiple pools. Binary search for budget-constrained fills.
- **Flash rebalancing**: FlashRebalancer uses flash loans for atomic cross-tranche moves. Flow: borrow → invest in target → transfer source tokens → withdraw → repay. Single tx, no intermediate capital needed.
- **Liquidation waterfall**: LiquidationBot provides permissionless keeper functions: oracle check → pool trigger → pool settle → margin liquidation. `executeWaterfall()` runs the full sequence atomically.
- **Beneficiary pattern**: `investFor(trancheId, amount, beneficiary)` and `buyProtectionFor(amount, maxPremium, beneficiary)` let routers act on behalf of users. Tokens pulled from `msg.sender`, ownership assigned to `beneficiary`.
- **eERC limitation**: ElGamal only supports addition. All comparison/multiplication must be plaintext. Using MockEERC until ZK proof infrastructure is built.
- **ICM/Teleporter**: Mocked for now (version conflict: eERC needs 0.8.27, Teleporter needs 0.8.25).

## Deployed Addresses (Fuji)

See README.md for full table. Key addresses:
- ForgeFactory: `0x52614038F825FbA5BE78ECf3eA0e3e0b21961d29`
- ShieldFactory: `0x9A9e51c6A91573dEFf7657baB7570EF4888Aaa3A`
- NexusHub: `0xE6bb9535bd754A993dc04E83279f92980F7ad9F4`
- HedgeRouter: `0x736fE313dEff821b71d1c2334DA95cC0eFf0B98c`
- MockUSDC: `0x09eC69338406B293b3f6Aa775A65C1FA7C0bC42f`
- Deployer: `0xD243eB302C08511743B0050cE77c02C80FeccCc8`
- Deployment block: 51648911

## Common Pitfalls

- `forge init --no-commit` and `forge install --no-commit` don't exist in Foundry
- WAD double-operations introduce rounding; use `assertApproxEqRel` in fuzz tests
- ForgeVault must init `lastDistribution = block.timestamp` or period calcs break
- Test warps must match expected periods exactly (use YEAR not YEAR+WEEK)
- `vm.computeCreateAddress` is needed for predicting deploy addresses when there are circular deps (tranche tokens need vault address, vault needs token addresses)
- Factory nonce starts at 1 after deployment (first `new Contract()` inside factory deploys at nonce 1)
- Foundry scripts hit "stack too deep" with many locals -- use contract state vars + helper functions
- Ponder v0.14 API: `chains` not `networks`, `id` not `chainId`, `rpc` not `transport`, `chain` not `network`
- Ponder schema: `onchainTable()`, `onchainEnum()`, `relations()` -- NOT Prisma-style
- wagmi v2 with `as const` ABIs: single-struct returns give named fields; multi-value returns give array indices
- Next.js needs ES2020+ target for BigInt literals (`0n`)
- Solidity requires explicit `override(Base1, Base2)` when two bases define same function signature

## File Map

| Area | Key Files |
|------|-----------|
| Forge core | `src/forge/ForgeVault.sol`, `src/forge/ForgeFactory.sol` |
| Shield core | `src/shield/CDSContract.sol`, `src/shield/ShieldFactory.sol` |
| CDS AMM | `src/shield/CDSPool.sol`, `src/shield/CDSPoolFactory.sol`, `src/libraries/BondingCurve.sol` |
| Nexus core | `src/nexus/NexusHub.sol`, `src/nexus/NexusVault.sol` |
| Routers | `src/HedgeRouter.sol`, `src/PoolRouter.sol`, `src/FlashRebalancer.sol` |
| Keeper | `src/LiquidationBot.sol` |
| Yield | `src/yield/YieldVault.sol`, `src/yield/YieldVaultFactory.sol`, `src/yield/StrategyRouter.sol`, `src/yield/LPIncentiveGauge.sol` |
| Math | `src/libraries/MeridianMath.sol`, `src/libraries/WaterfallDistributor.sol` |
| Tests | `test/forge/`, `test/shield/`, `test/nexus/`, `test/yield/`, `test/invariants/`, `test/*.t.sol` |
| Deploy | `script/DeployFuji.s.sol`, `script/DeployPhase5.s.sol`, `script/DeployHedgeRouter.s.sol` |
| Demo | `script/Demo.s.sol` (12-step end-to-end protocol walkthrough) |
| Frontend | `frontend/src/app/` (pages incl. `/strategies`, `/analytics`), `frontend/src/hooks/` (wagmi hooks) |
| Indexer | `indexer/src/` (handlers), `indexer/ponder.config.ts`, `indexer/ponder.schema.ts` |
| Backlog | `backlog.md` |
