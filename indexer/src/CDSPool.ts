import { ponder } from "ponder:registry";
import { cdsPool, poolDeposit, protectionPosition } from "ponder:schema";

ponder.on("CDSPool:LiquidityDeposited", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();

  // Record deposit event
  await context.db.insert(poolDeposit).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    poolId: poolAddress,
    lp: event.args.lp,
    amount: event.args.amount,
    shares: event.args.shares,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });

  // Update pool totals
  await context.db
    .insert(cdsPool)
    .values({
      id: poolAddress,
      poolId: 0n,
      referenceAsset: "0x0000000000000000000000000000000000000000",
      collateralToken: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      maturity: 0n,
      baseSpreadWad: 0n,
      slopeWad: 0n,
      creator: "0x0000000000000000000000000000000000000000",
      status: "Active",
      totalDeposits: event.args.amount,
      totalPremiumsEarned: 0n,
      totalProtectionSold: 0n,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate((row) => ({
      totalDeposits: row.totalDeposits + event.args.amount,
    }));
});

ponder.on("CDSPool:LiquidityWithdrawn", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();

  await context.db
    .insert(cdsPool)
    .values({
      id: poolAddress,
      poolId: 0n,
      referenceAsset: "0x0000000000000000000000000000000000000000",
      collateralToken: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      maturity: 0n,
      baseSpreadWad: 0n,
      slopeWad: 0n,
      creator: "0x0000000000000000000000000000000000000000",
      status: "Active",
      totalDeposits: 0n,
      totalPremiumsEarned: 0n,
      totalProtectionSold: 0n,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate((row) => ({
      totalDeposits:
        row.totalDeposits > event.args.amount
          ? row.totalDeposits - event.args.amount
          : 0n,
    }));
});

ponder.on("CDSPool:ProtectionBought", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();

  await context.db.insert(protectionPosition).values({
    id: `${poolAddress}-${event.args.positionId}`,
    poolId: poolAddress,
    positionId: event.args.positionId,
    buyer: event.args.buyer,
    notional: event.args.notional,
    premiumPaid: event.args.premium,
    spreadWad: event.args.spreadWad,
    active: true,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
  });

  await context.db
    .insert(cdsPool)
    .values({
      id: poolAddress,
      poolId: 0n,
      referenceAsset: "0x0000000000000000000000000000000000000000",
      collateralToken: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      maturity: 0n,
      baseSpreadWad: 0n,
      slopeWad: 0n,
      creator: "0x0000000000000000000000000000000000000000",
      status: "Active",
      totalDeposits: 0n,
      totalPremiumsEarned: 0n,
      totalProtectionSold: event.args.notional,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate((row) => ({
      totalProtectionSold: row.totalProtectionSold + event.args.notional,
    }));
});

ponder.on("CDSPool:ProtectionClosed", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();
  const posKey = `${poolAddress}-${event.args.positionId}`;

  await context.db
    .insert(protectionPosition)
    .values({
      id: posKey,
      poolId: poolAddress,
      positionId: event.args.positionId,
      buyer: event.args.buyer,
      notional: 0n,
      premiumPaid: 0n,
      spreadWad: 0n,
      active: false,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      txHash: event.transaction.hash,
    })
    .onConflictDoUpdate(() => ({
      active: false,
    }));
});

ponder.on("CDSPool:PremiumsAccrued", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();

  await context.db
    .insert(cdsPool)
    .values({
      id: poolAddress,
      poolId: 0n,
      referenceAsset: "0x0000000000000000000000000000000000000000",
      collateralToken: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      maturity: 0n,
      baseSpreadWad: 0n,
      slopeWad: 0n,
      creator: "0x0000000000000000000000000000000000000000",
      status: "Active",
      totalDeposits: 0n,
      totalPremiumsEarned: event.args.totalAccrued,
      totalProtectionSold: 0n,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate((row) => ({
      totalPremiumsEarned: row.totalPremiumsEarned + event.args.totalAccrued,
    }));
});

ponder.on("CDSPool:CreditEventTriggered", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();

  await context.db
    .insert(cdsPool)
    .values({
      id: poolAddress,
      poolId: 0n,
      referenceAsset: "0x0000000000000000000000000000000000000000",
      collateralToken: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      maturity: 0n,
      baseSpreadWad: 0n,
      slopeWad: 0n,
      creator: "0x0000000000000000000000000000000000000000",
      status: "Triggered",
      totalDeposits: 0n,
      totalPremiumsEarned: 0n,
      totalProtectionSold: 0n,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate(() => ({
      status: "Triggered" as const,
    }));
});

ponder.on("CDSPool:PoolSettled", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();

  await context.db
    .insert(cdsPool)
    .values({
      id: poolAddress,
      poolId: 0n,
      referenceAsset: "0x0000000000000000000000000000000000000000",
      collateralToken: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      maturity: 0n,
      baseSpreadWad: 0n,
      slopeWad: 0n,
      creator: "0x0000000000000000000000000000000000000000",
      status: "Settled",
      totalDeposits: 0n,
      totalPremiumsEarned: 0n,
      totalProtectionSold: 0n,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate(() => ({
      status: "Settled" as const,
      totalProtectionSold: 0n,
    }));
});

ponder.on("CDSPool:PoolExpired", async ({ event, context }) => {
  const poolAddress = event.log.address.toLowerCase();

  await context.db
    .insert(cdsPool)
    .values({
      id: poolAddress,
      poolId: 0n,
      referenceAsset: "0x0000000000000000000000000000000000000000",
      collateralToken: "0x0000000000000000000000000000000000000000",
      oracle: "0x0000000000000000000000000000000000000000",
      maturity: 0n,
      baseSpreadWad: 0n,
      slopeWad: 0n,
      creator: "0x0000000000000000000000000000000000000000",
      status: "Expired",
      totalDeposits: 0n,
      totalPremiumsEarned: 0n,
      totalProtectionSold: 0n,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
    })
    .onConflictDoUpdate(() => ({
      status: "Expired" as const,
      totalProtectionSold: 0n,
    }));
});
