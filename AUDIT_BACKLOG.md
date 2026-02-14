# MERIDIAN — Security Audit Backlog

## Pass 1 — Full Protocol Audit (59 findings across 4 parallel audits)

### CRITICAL (5 findings)

- [x] C-01: MeridianMath `wadMul`/`wadDiv`/`bpsMul` unchecked overflow — silent wrap-around in foundational math used by every contract
- [x] C-02: ForgeVault `_totalPendingYield()` always returns 0 — yield double-counting, vault insolvency
- [x] C-03: CDSPool `settle()` has no access control — anyone can call with arbitrary recovery rate
- [x] C-04: CDSPool first-depositor share precision attack — no virtual offset or minimum deposit
- [ ] C-05: BondingCurve `quotePremium` unchecked overflow for tiny notionals — final chunk underflow wraps (edge case, requires notional < 10 wei)

### HIGH (16 findings)

- [x] H-01: ForgeVault `withdraw()` doesn't decrement `totalDeposited`/`totalPoolDeposited` — inflated obligations + coupon math
- [x] H-02: PoolRouter/CDSPool positions owned by router, not end user — payouts permanently stuck
- [x] H-03: CDSContract allows zero-premium protection near maturity (< 1 day)
- [x] H-04: NexusHub liquidation seizes ALL collateral regardless of debt — penalty unused
- [x] H-05: YieldVault ERC4626 inflation attack — no `_decimalsOffset()` override
- [x] H-06: MockEERC silently swallows transfer hook failures — mirror desync risk
- [x] H-07: LPIncentiveGauge flash-deposit reward theft — reads live pool balances without staking
- [x] H-08: ForgeVault `onShareTransfer` lacks `nonReentrant` — added modifier
- [x] H-09: WaterfallDistributor `_couponOwed` unchecked overflow — removed unchecked, split into bpsMul chain
- [~] H-10: CreditEventOracle single reporter — accepted for MVP (multi-reporter already exists, quorum is future work)
- [x] H-11: CDSPool premium accrual exceeds premiumPaid — added per-position `positionPremiumAccrued` tracker with hard cap
- [x] H-12: NexusVault withdrawal no health check — added `withdrawalLocked` + `unlockWithdrawal()` with re-attestation
- [x] H-13: Cross-chain attestation no expiry — added `attestationMaxAge` (1hr default) + timestamp tracking, stale values skipped
- [x] H-14: FlashRebalancer callback hijack — added `_inFlashLoan` flag, verified in `onFlashLoan`
- [x] H-15: CDSPool settle excess LP loss — capped payout at `totalDeposits` not `totalAssets()`
- [x] H-16: ICDSContract missing `expire()` — added to interface

### MEDIUM (20 findings)

- [x] M-01: ForgeVault `setPoolStatus` no transition constraints — added state machine validation
- [ ] M-02: CDSPool unbounded loops in `_accruePremiums`/`settle()` — gas DoS
- [ ] M-03: CDSPool withdrawal accounting incorrect (deposit/premium split)
- [ ] M-04: CDSPool `settle()` push-based transfers — griefing by malicious buyer contracts
- [ ] M-05: ShieldPricer no `transferOwnership` — frozen if key lost
- [x] M-06: CollateralOracle triple multiply DoS — split into wadMul + bpsMul
- [x] M-07: HedgeRouter leaves residual token approvals — added approve(0) after calls
- [x] M-08: YieldVault `emergencyWithdraw` phantom `totalInvested` — clear before try/catch
- [x] M-09: StrategyRouter BPS rounding dust — last vault gets remainder
- [x] M-10: NexusHub unbounded `_userAssets` array — added MAX_ASSETS_PER_ACCOUNT (20)
- [ ] M-11: FlashRebalancer assumes 1:1 tranche token ratio
- [ ] M-12: Teleporter message no replay protection
- [x] M-13: LPIncentiveGauge `rewardRate` truncation — added min rewardRate check
- [ ] M-14: YieldVault `nonReentrant` on internal hooks — composability issue
- [ ] M-15: HedgeRouter `createAndHedge` creates CDS with no seller
- [ ] M-16: ForgeFactory no tranche token binding validation
- [ ] M-17: CDSPool front-running / MEV (sandwich attacks)
- [ ] M-18: CDSPool LP self-dealing spread manipulation
- [x] M-19: Interface incompleteness — added missing functions to INexusHub, ICDSPool, ICreditEventOracle
- [ ] M-20: NexusHub `_processLiquidationComplete` clears all obligations regardless of proceeds

### LOW (8 findings)

- [ ] L-01: PremiumEngine `remainingPremium` truncates partial days
- [ ] L-02: ShieldFactory/CDSPoolFactory no economic bounds on creation params
- [ ] L-03: CreditEventOracle `clearEvent` emits no event
- [ ] L-04: CDSContract allows selling protection after maturity
- [ ] L-05: StrategyRouter no closed position cleanup
- [ ] L-06: NexusHub `setLiquidationParams` no upper bound on penalty
- [ ] L-07: TrancheToken runtime signature computation (fragile)
- [ ] L-08: IWaterfallDistributor dead code with mismatched structs
