import { ponder } from "ponder:registry";
import { cdsContract } from "ponder:schema";

ponder.on("ShieldFactory:CDSCreated", async ({ event, context }) => {
  const cdsAddress = event.args.cds.toLowerCase();
  const referenceVaultId = event.args.referenceAsset.toLowerCase();

  await context.db.insert(cdsContract).values({
    id: cdsAddress,
    cdsId: event.args.cdsId,
    referenceVaultId,
    creator: event.args.creator,
    buyer: null,
    seller: null,
    protectionAmount: event.args.protectionAmount,
    premiumRate: event.args.premiumRate,
    maturity: event.args.maturity,
    collateralToken: "0x0000000000000000000000000000000000000000", // read from contract or set later
    status: "Open",
    collateralPosted: 0n,
    totalPremiumPaid: 0n,
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
  });
});
