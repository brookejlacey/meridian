# MERIDIAN — Implementation Backlog

## Architecture Notes & Research Insights

### eERC Critical Facts
- **Solidity 0.8.27 required** — all contracts must target this version
- **Gas costs**: Register ~322k, Mint ~722k, Transfer ~947k, Burn ~1.03M
- **Deployment cost**: ~12M gas total for eERC infrastructure (~$200 at standard rates)
- **ElGamal on BabyJubJub** — balances are 4 field elements (c1_x, c1_y, c2_x, c2_y)
- **Additive homomorphism**: can add/subtract encrypted balances without decryption
- **Standalone vs Converter**: Standalone for new tokens (tranche tokens), Converter for wrapping existing (USDC into Nexus)
- **Auditor via Poseidon commitments**: every transaction includes auditorPCT for decryption
- **Registrar contract**: manages user public keys (one-time registration, immutable)
- **Client-side SDK**: WASM-based proof generation, ~500ms-2s per proof
- **ZK Circuits**: Registration (~1k constraints), Mint (~4k), Transfer (~8k), Burn (~4k)
- **Trusted setup**: Uses Powers of Tau ceremony (zkevm). Dev mode uses synthetic setup.
- **No key recovery**: lost private key = lost access forever. Important UX consideration.

### ICM/Teleporter Critical Facts
- **TeleporterMessenger primary address**: `0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf`
- **Nick's method deployment**: same address on all chains (deterministic)
- **Message format**: TeleporterMessageInput with destinationBlockchainID, destinationAddress, feeInfo, requiredGasLimit, allowedRelayerAddresses, message bytes
- **ITeleporterReceiver interface**: single function `receiveTeleporterMessage(sourceBlockchainID, originSenderAddress, message)`
- **TeleporterRegistryOwnableApp**: recommended base contract for all cross-chain dApps
- **Receipt piggybacking**: delivery confirmations included in next opposing-direction message
- **Retry mechanism**: failed executions stored, can retry with `retryMessageExecution()`
- **Gas limit**: must include 20% buffer for EIP-150 (63/64 rule)
- **Fee tokens**: any ERC-20, stored for relayer reward. Can bump with `addFeeAmount()`
- **Fuji C-Chain ID**: 43113

### Structured Credit Patterns (from DeFi research)
- **Lazy evaluation pattern is best** for waterfall — O(1) distribution, calculate on-demand
- **Pull-based interest** — users claim their own yield (like MasterChef/Sushi pattern)
- **Queue-based withdrawals** — prevent bank runs, max X% per period
- **ERC-20 per tranche** — best wallet/DEX support despite slight gas inefficiency
- **Hybrid credit event oracle** — 2+ data sources, dispute period, governance override
- **Storage packing** — pack tranche data into fewer slots for gas savings
- **Precision loss pitfall** — allocate one tranche exactly, rest gets remainder
- **MEV in distributions** — use scheduled distributions, not on-demand
- **Senior/Junior simplest** — start with 2-3 tranches max, complexity scales poorly

### Four-Zone Architecture (from deep architectural analysis)
- **Zone 1 (Public Global)**: Pool params, oracle prices, aggregate metrics — visible to everyone
- **Zone 2 (Private Internal)**: Per-user share counts, yield accumulators, margin state — in contract storage, never exposed via public getters
- **Zone 3 (Encrypted External)**: eERC token balances — only holder + auditor can read
- **Zone 4 (Private Off-Chain)**: User BabyJubJub keys, decrypted balances — never on-chain

### Core Pattern: "Minter-Knows"
ForgeVault mints tranche tokens → it inherently knows share counts → keeps plaintext mirror for waterfall math → eERC provides encrypted external view. Transfer hook syncs plaintext mirror on secondary market trades.

### Fundamental Cryptographic Limitation
ElGamal (eERC) supports ONLY additive homomorphism. Cannot do: multiplication of two ciphertexts, comparison, division, or conditional branching on encrypted values. All waterfall logic, margin calculations, and CDS pricing MUST operate in plaintext (Zone 2). This is not a bug — it's the correct design.

### Key Design Decisions Made
1. **Four-zone architecture**: public aggregates, private internal state, encrypted tokens, off-chain keys
2. **Minter-Knows pattern**: vault keeps plaintext mirror, eERC for external privacy
3. **Pull-based yield distribution**: holders claim via eERC transfer (~950k gas each)
4. **Tranche tokens = eERC Standalone**: each tier is separate encrypted ERC-20
5. **Hub as Auditor (MVP)**: NexusHub can decrypt positions. ZK proofs in v2.
6. **Foundry primary**: Foundry for Meridian contracts, pre-compiled eERC artifacts as deps
7. **TeleporterRegistryOwnableApp**: base contract for all cross-chain Nexus contracts
8. **Plaintext-first dev**: build with ERC-20 first, swap to eERC after logic is proven
9. **Transfer hook**: `onShareTransfer()` keeps plaintext mirrors in sync
10. **Binary health signal**: NexusHub exposes only `isHealthy[user]` boolean, no amounts
11. **Scheduled waterfall**: time-based (weekly), not on-demand (prevents MEV)

---

## Open Questions / Things to Investigate

### P0 — Resolved (through implementation or investigation)
- [x] **eERC Standalone minting authority**: ANSWERED — `privateMint()` requires ZK proof even with `onlyOwner`. Confirmed by reading EncryptedERC.sol source. Using plaintext TrancheToken + MockEERC simulation (EncryptedTrancheToken) for now.
- [x] **eERC transfer from contract**: ANSWERED — transfers also require ZK proofs. Using MockEERC with simplified mint/burn/transfer.
- [x] **eERC + Foundry compilation**: TESTED — Foundry can compile eERC sources. Reference copy at `encrypted-erc/`.
- [x] **Solidity 0.8.27 compatibility**: CONFIRMED — OpenZeppelin v5 compiles with 0.8.27. ICM/Teleporter needs 0.8.25 (version conflict, mocked).
- [x] **eERC transfer hooks**: IMPLEMENTED — EncryptedTrancheToken overrides `_callTransferHook()` with `require(success)` + `ShareTransferHook` event.
- [ ] **Calldata privacy leak**: DOCUMENTED — accepted risk for MVP. Plaintext amounts visible in calldata. Real mitigation requires client-side proof generation.

### P1 — Still open (not blocking current work)
- [ ] **Avalanche L1 creation on Fuji**: Needed for real cross-chain Nexus deployment. Requires Avalanche CLI + AWM relayer.
- [ ] **Chainlink on Fuji**: Currently using MockOracle. Need to investigate Chainlink feed availability for production.
- [ ] **eERC SDK browser compatibility**: Needed when integrating real eERC. WASM proof generation + CSP considerations.
- [x] **Queue-based withdrawal timing**: DECIDED — not implemented. Simple withdraw() for now. Queue-based is future optimization.

### P2 — Future research
- [ ] **Homomorphic yield accumulation**: Privacy optimization. Add ~300k gas but avoids plaintext amounts in yield claims.
- [ ] **Challenge-and-prove liquidation**: Custom Circom circuit for margin health proof. V2 scope.
- [ ] **Encrypted ICM messages**: ZK proofs wrapping cross-chain position deltas. V2 scope.

---

## Risk Register

### High Risk
- **eERC contract interaction**: CONFIRMED — `privateMint()` requires ZK proof even with `onlyOwner`. Smart contracts cannot generate ZK proofs on-chain.
  - *Status*: Working around with plaintext TrancheToken + MockEERC simulation. Real integration needs off-chain keeper pattern.
  - *Impact*: Defers real eERC integration. Protocol logic is fully proven with plaintext tokens.

### Medium Risk (resolved or mitigated)
- **Teleporter version conflict**: CONFIRMED — eERC needs 0.8.27, Teleporter needs 0.8.25. Cannot compile together.
  - *Status*: Using MockTeleporter. Cross-chain logic is tested and deployed. Will resolve when Teleporter updates or via multi-compiler setup.

- **Gas costs**: MITIGATED — pull-based model works. Gas benchmarks documented (invest ~208k, claim ~660k, waterfall ~632k).

- **Solidity version conflicts**: RESOLVED — OpenZeppelin v5 compiles with 0.8.27. Only Teleporter has version conflict.

### Low Risk
- **Frontend ZK proof UX**: Not yet relevant — deferred until real eERC integration.
- **Deployer key management**: Single deployer key (`0xD243eB...`) controls all admin functions. Need multisig for production.

---

## Current Status (as of 2026-02-11)

**378 tests passing** across all suites (10k-run fuzz + invariant tests). Full protocol deployed to Avalanche Fuji. Gas optimization complete (911k gas saved). 12-step E2E demo script runs successfully.

| Layer | Status | Tests | Deployed |
|-------|--------|-------|----------|
| Forge (structured credit) | Complete | 47 | Fuji |
| Shield (CDS) | Complete | 73 | Fuji |
| CDS AMM Pool | Complete | 53 | Deploy script ready |
| Nexus (margin) | Complete | 68 | Fuji |
| EncryptedTrancheToken | Complete (simulation) | 28 | N/A |
| HedgeRouter | Complete | 19 | Fuji |
| FlashRebalancer | Complete | 8 | Deploy script ready |
| PoolRouter | Complete | 8 | Deploy script ready |
| LiquidationBot | Complete | 14 | Deploy script ready |
| Invariant Tests | Complete | 3 | N/A |
| Frontend (Next.js) | Complete (+Strategies +Analytics) | Build passes | N/A |
| Ponder Indexer | Complete | N/A | N/A |
| CI/CD | Complete | N/A | GitHub Actions |
| Demo Script | Complete (12 steps) | N/A | script/Demo.s.sol |
| YieldVault (auto-compound) | Complete | 19 | Deploy script ready |
| StrategyRouter (multi-vault) | Complete | 16 | Deploy script ready |
| LPIncentiveGauge | Complete | 19 | Deploy script ready |
| Yield Integration | Complete | 3 | N/A |
| Gas Optimization | Complete | N/A | 911k gas saved |
| Deploy Scripts | Complete | N/A | DeployFuji + DeployPhase5 |

**Next recommended priorities** (in order):
1. **Broadcast DeployPhase5.s.sol to Fuji** — `forge script script/DeployPhase5.s.sol --rpc-url fuji --broadcast`, update frontend .env.local
2. **Secondary market for tranche tokens** (#9) — DEX integration, enables real price discovery
3. **Security audit prep** (#12) — Slither/Mythril static analysis, documentation review
4. **Real eERC integration** — requires off-chain ZK proof generation infrastructure (biggest lift)
5. **WalletConnect project ID** — replace placeholder in frontend for demo-ready state

---

## Lessons Learned

### Phase 1B (Forge)
- `forge init --no-commit` and `forge install --no-commit` don't exist in Foundry
- WAD double-operations introduce rounding; use `assertApproxEqRel` in fuzz tests
- ForgeVault must init `lastDistribution = block.timestamp` or period calcs break
- Test warps must match expected periods exactly (use YEAR not YEAR+WEEK)
- `vm.computeCreateAddress` useful for predicting deploy addresses in setUp

### Phase 2 (Shield)
- CDSContract `settle()` returns BOTH protection payout AND unused premium deposit to buyer
- ShieldPricer risk multiplier: `(1-collateralRatio) * multiplier` uses WAD math — 90% deficit * 2000 bps yields ~1800 bps, not 18000
- `hasActiveEvent()` needed adding to ICreditEventOracle interface for CDSContract to compile

### Phase 3 (Nexus)
- INexusHub struct `MarginAccount` collides with imported library name `MarginAccount` — renamed to `AccountInfo`
- Foundry tests start at block.timestamp=1 — attestation interval checks vs lastAttestation=0 need initial warp
- Fuzz bounds matter: small collateral + huge borrow → WAD rounding > 0.001% — use 1e14 tolerance and min 1e18

### Phase 4 (Frontend)
- wagmi v2 with `as const` ABIs: single-struct returns → named object fields; multi-value returns → array indices
- Next.js create-next-app defaults to ES2017 target — need ES2020+ for BigInt literals (`0n`)
- RainbowKit getDefaultConfig needs `ssr: true` for Next.js App Router

### Phase 1C (EncryptedTrancheToken)
- Solidity requires explicit `override(Base1, Base2)` when two bases define same function signature
- MockEERC `mint`/`burn` needed `virtual` keyword for EncryptedTrancheToken to override
- MockEERC `_callTransferHook` also needed `virtual` for hook behavior override
- `new Contract()` in test function makes it non-view — can't use `public view` test functions that deploy contracts

### Deployment
- Foundry scripts hit "stack too deep" with many locals in one function — use contract state vars + helper functions
- `vm.computeCreateAddress` works in scripts (not just tests) for predicting CREATE addresses
- Factory nonce starts at 1 after deployment — first `new Contract()` inside factory deploys at nonce 1
- `forge create` has issues with Windows shell URL handling — use `forge script` with named RPC endpoints instead

### Ponder Indexer
- Ponder v0.14 API: `chains` not `networks`, `id` not `chainId`, `rpc` not `transport`, `chain` not `network`
- Ponder factory pattern: `factory({ address, event: parseAbiItem("event ..."), parameter: "..." })`
- Ponder schema: `onchainTable()`, `onchainEnum()`, `relations()` — NOT Prisma-style
- Ponder handlers: `context.db.insert().values().onConflictDoUpdate()` for upserts

### Auto-Hedging
- `msg.sender` ownership problem: router calling invest/buyProtection becomes investor/buyer
- Solution: `*For()` variants with beneficiary param — caller pays, beneficiary owns
- `_settleYield()` only accumulates pending yield — doesn't transfer; user must call `claimYield()`
- Solidity public struct fields generate getters returning individual values, not struct — add explicit `getTerms()`

### CDS Bonding Curve AMM
- `vm.expectRevert` doesn't work with internal library calls (inlined) — need wrapper contract for revert tests
- `vm.prank(alice)` is consumed by the first external call — `pool.withdraw(pool.sharesOf(alice))` fails because `sharesOf()` consumes the prank, then `withdraw` runs as test contract. Cache value first: `uint256 s = pool.sharesOf(alice); vm.prank(alice); pool.withdraw(s);`
- Trapezoidal integration (N=10 steps) for bonding curve premium quotes: accurate enough for DeFi, avoids complex calculus
- ERC4626-style LP shares: first depositor gets 1:1, subsequent deposits proportional to totalAssets/totalShares
- Premium accrual per position: `notional * spread * elapsed / YEAR`, capped at proportional premium deposit
- Withdraw must check `assetsAfter >= totalProtectionSold` to prevent undercollateralization

---

## Phase Completion Checklist

### Phase 1: Foundation (Forge) — COMPLETE
- [x] Project scaffolded with Foundry
- [x] All dependencies installed and compiling
- [x] MockEERC and MockTeleporter created
- [x] ForgeFactory deploys ForgeVaults
- [x] ForgeVault accepts deposits
- [x] TrancheToken mints plaintext positions (eERC simulation via EncryptedTrancheToken)
- [x] WaterfallDistributor correctly prioritizes payments
- [x] Pull-based yield claiming works
- [ ] AuditorRegistry manages decryption permissions (deferred — requires real eERC)
- [x] All unit tests pass (47 Forge + 28 EncryptedTrancheToken)
- [x] Fuzz tests for waterfall with 10k+ runs
- [x] Gas snapshot generated
- [x] Deployed to Fuji testnet
- [ ] End-to-end test on Fuji passes (manual testing only)

### Phase 2: Risk Layer (Shield) — COMPLETE
- [x] ShieldFactory creates CDS contracts
- [x] CDSContract manages full lifecycle (buy/sell/pay premium/trigger/settle/expire)
- [x] Premium streaming works (plaintext — eERC deferred)
- [x] CreditEventOracle monitors vault health
- [x] Auto-trigger on threshold breach (`checkAndTrigger()`)
- [x] Settlement transfers collateral correctly
- [x] ShieldPricer quotes indicative spreads
- [ ] CDSMarketplace matches buyers/sellers (deferred — using direct factory/CDS for now)
- [x] Integration test: vault impairment → CDS settlement
- [ ] All positions eERC-encrypted (deferred — requires real eERC)
- [x] Deployed to Fuji

### Phase 3: Cross-Chain Margin (Nexus) — COMPLETE (mock cross-chain)
- [ ] Test L1 created with Avalanche CLI (deferred — using MockTeleporter)
- [ ] Teleporter working between C-Chain and L1 (mocked — Solidity version conflict 0.8.25 vs 0.8.27)
- [x] NexusHub deployed on C-Chain (Fuji)
- [x] NexusVault deployed on C-Chain (Fuji — will move to L1 when Teleporter is real)
- [x] Cross-chain balance attestation working (via MockTeleporter)
- [x] Margin calculation with risk weights (CollateralOracle + MarginAccount library)
- [x] Forge tranche tokens accepted as collateral (Senior 85%, Mezz 60%, Equity 40%)
- [x] Cross-chain liquidation executes (68 tests including liquidation flows)
- [x] All tests pass (68 Nexus tests)
- [ ] Deployed to Fuji + L1 (C-Chain only — L1 requires real Teleporter)

### Phase 4: Dashboard & Polish — COMPLETE (plaintext mode)
- [x] Next.js 16 app scaffolded (wagmi v2 + RainbowKit + Tailwind CSS)
- [x] Wallet connection working (RainbowKit + Avalanche Fuji)
- [ ] eERC SDK integrated (deferred — requires real eERC)
- [x] Forge dashboard: explore vaults, invest, claim yield, withdraw, trigger waterfall
- [x] Shield dashboard: browse CDS, buy/sell protection, pay premium, trigger/settle/expire
- [x] Nexus dashboard: margin account, deposit/withdraw collateral, health factor
- [ ] Auditor view with selective disclosure (deferred — requires real eERC)
- [x] Full user story executable via UI (Forge + Shield + Nexus + HedgeRouter)
- [x] Ponder indexer integrated (GraphQL replaces O(N) RPC calls)
- [x] HedgePanel on vault detail page (atomic invest + hedge)
- [ ] Demo-ready (needs WalletConnect project ID, testnet USDC faucet flow)

---

## Backlog Items

### Completed
- ~~2. Auto-hedging (Forge invest + Shield protect in one tx)~~ **DONE** — HedgeRouter + investFor/buyProtectionFor
- ~~14. Subgraph/indexer for historical data~~ **DONE** — Ponder indexer + frontend integration
- ~~3. CDS bonding curve AMM~~ **DONE** — CDSPool + CDSPoolFactory + BondingCurve library + frontend + indexer
- ~~1. Flash tranche rebalancing~~ **DONE** — FlashRebalancer + MockFlashLender, atomic cross-tranche moves via flash loans
- ~~Multi-pool router~~ **DONE** — PoolRouter with greedy cheapest-first fill algorithm
- ~~Liquidation keeper~~ **DONE** — LiquidationBot with full waterfall execution
- ~~Risk analytics dashboard~~ **DONE** — /analytics page with protocol-wide metrics, tranche breakdown, pool table
- ~~CI/CD pipeline~~ **DONE** — GitHub Actions (Solidity build+test+gas, Frontend build+typecheck)
- ~~Invariant tests~~ **DONE** — CDSPool solvency, zombie shares, utilization cap invariants
- ~~E2E demo script~~ **DONE** — script/Demo.s.sol exercises full 12-step protocol lifecycle
- ~~Yield vault strategies~~ **DONE** — YieldVault (ERC4626 auto-compounder), YieldVaultFactory, StrategyRouter (multi-vault optimizer), LPIncentiveGauge (CDSPool LP mining), frontend /strategies page
- ~~Gas optimization pass~~ **DONE** — unchecked blocks in MeridianMath, BondingCurve, WaterfallDistributor, MarginAccount, ForgeVault, CDSPool loops. 911,671 gas saved.
- ~~Deploy scripts~~ **DONE** — DeployPhase5.s.sol covers CDSPoolFactory, PoolRouter, FlashRebalancer, LiquidationBot, YieldVaultFactory, StrategyRouter, LPIncentiveGauge

### High Priority (next up)
- 9. **Secondary market for tranche tokens** — DEX integration (Uniswap V3 on Fuji or TraderJoe). Enables real price discovery.
- 12. **Security audit prep** — Slither/Mythril static analysis, review access controls, documentation.

### Medium Priority (protocol maturity)
- 6. **Liquidation insurance pool** — backstop for slow liquidations in Nexus margin engine.
- 10. **Dynamic tranche ratios** — auto-adjust senior/mezz/equity based on pool health metrics.

### Lower Priority (v2 features)
- 4. Credit scoring oracle (originator reputation → pricing)
- 5. Proof of reserves (cryptographic solvency proof)
- 7. Institutional compliance mode (full auditor visibility deployment)
- 8. Multi-auditor support (different auditors for different aspects)
- 11. Governance token and DAO structure
- 15. Email/push notifications for credit events and liquidation warnings

### Infrastructure (when ready for production)
- **Real eERC integration** — requires off-chain ZK proof generation infrastructure, client-side WASM SDK, keeper for contract-initiated mints
- **Real Teleporter integration** — requires Avalanche L1 creation, AWM relayer setup, resolving 0.8.25/0.8.27 version conflict
- **WalletConnect project ID** — replace placeholder in frontend/.env.local
- **Testnet faucet flow** — document or build a faucet for MockUSDC on Fuji
- ~~**CI/CD pipeline**~~ — **DONE** — GitHub Actions for Solidity build+test+gas + Frontend build+typecheck
