import { ponder } from "ponder:registry";
import { cdsPool } from "ponder:schema";

ponder.on("CDSPoolFactory:PoolCreated", async ({ event, context }) => {
  const poolAddress = event.args.pool.toLowerCase();

  await context.db.insert(cdsPool).values({
    id: poolAddress,
    poolId: event.args.poolId,
    referenceAsset: event.args.referenceAsset,
    collateralToken: "0x0000000000000000000000000000000000000000", // read from pool terms
    oracle: "0x0000000000000000000000000000000000000000",
    maturity: event.args.maturity,
    baseSpreadWad: event.args.baseSpreadWad,
    slopeWad: event.args.slopeWad,
    creator: event.args.creator,
    status: "Active",
    totalDeposits: 0n,
    totalPremiumsEarned: 0n,
    totalProtectionSold: 0n,
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
  });
});
