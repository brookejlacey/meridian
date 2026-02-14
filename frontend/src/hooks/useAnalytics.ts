"use client";

import { useQuery } from "@tanstack/react-query";
import { graphqlQuery } from "@/lib/graphql/client";
import { VAULTS_QUERY, CDS_LIST_QUERY } from "@/lib/graphql/queries";
import { usePoolCount, usePoolAddress } from "@/hooks/useCDSPoolFactory";
import {
  usePoolStatus,
  useTotalAssets,
  useUtilizationRate,
  useCurrentSpread,
  useTotalProtectionSold,
} from "@/hooks/useCDSPool";
import { type Address } from "viem";

// ---------- Types ----------

export interface VaultSummary {
  id: string;
  vaultId: string;
  status: string;
  totalDeposited: string;
  totalYieldReceived: string;
  totalYieldDistributed: string;
  tranches: {
    items: {
      trancheId: number;
      targetApr: string;
      allocationPct: string;
      totalInvested: string;
    }[];
  };
}

export interface CDSSummary {
  id: string;
  cdsId: string;
  status: string;
  protectionAmount: string;
  collateralPosted: string;
  totalPremiumPaid: string;
}

export interface ProtocolMetrics {
  totalVaultTVL: bigint;
  totalYieldGenerated: bigint;
  totalYieldDistributed: bigint;
  vaultCount: number;
  activeVaults: number;
  cdsCount: number;
  activeCDS: number;
  totalProtectionBilateral: bigint;
  totalCollateralPosted: bigint;
  totalPremiumsPaid: bigint;
  seniorTVL: bigint;
  mezzTVL: bigint;
  equityTVL: bigint;
  weightedAvgApr: number;
}

// ---------- Hooks ----------

/** Fetch protocol-wide aggregate metrics from the indexer */
export function useProtocolMetrics() {
  return useQuery({
    queryKey: ["protocol-metrics"],
    queryFn: async (): Promise<ProtocolMetrics> => {
      const [vaultData, cdsData] = await Promise.all([
        graphqlQuery<{ vaults: { items: VaultSummary[] } }>(VAULTS_QUERY),
        graphqlQuery<{ cdsContracts: { items: CDSSummary[] } }>(CDS_LIST_QUERY),
      ]);

      const vaults = vaultData.vaults.items;
      const cds = cdsData.cdsContracts.items;

      let totalVaultTVL = 0n;
      let totalYieldGenerated = 0n;
      let totalYieldDistributed = 0n;
      let activeVaults = 0;
      let seniorTVL = 0n;
      let mezzTVL = 0n;
      let equityTVL = 0n;
      let totalWeightedApr = 0n;
      let totalInvested = 0n;

      for (const v of vaults) {
        const deposited = BigInt(v.totalDeposited || "0");
        totalVaultTVL += deposited;
        totalYieldGenerated += BigInt(v.totalYieldReceived || "0");
        totalYieldDistributed += BigInt(v.totalYieldDistributed || "0");
        if (v.status !== "Closed" && v.status !== "Matured") activeVaults++;

        for (const t of v.tranches.items) {
          const invested = BigInt(t.totalInvested || "0");
          const apr = BigInt(t.targetApr || "0");
          if (t.trancheId === 0) seniorTVL += invested;
          else if (t.trancheId === 1) mezzTVL += invested;
          else equityTVL += invested;
          totalWeightedApr += invested * apr;
          totalInvested += invested;
        }
      }

      let totalProtectionBilateral = 0n;
      let totalCollateralPosted = 0n;
      let totalPremiumsPaid = 0n;
      let activeCDS = 0;

      for (const c of cds) {
        totalProtectionBilateral += BigInt(c.protectionAmount || "0");
        totalCollateralPosted += BigInt(c.collateralPosted || "0");
        totalPremiumsPaid += BigInt(c.totalPremiumPaid || "0");
        if (c.status === "Active") activeCDS++;
      }

      const weightedAvgApr =
        totalInvested > 0n
          ? Number(totalWeightedApr / totalInvested) / 100
          : 0;

      return {
        totalVaultTVL,
        totalYieldGenerated,
        totalYieldDistributed,
        vaultCount: vaults.length,
        activeVaults,
        cdsCount: cds.length,
        activeCDS,
        totalProtectionBilateral,
        totalCollateralPosted,
        totalPremiumsPaid,
        seniorTVL,
        mezzTVL,
        equityTVL,
        weightedAvgApr,
      };
    },
    refetchInterval: 15_000,
  });
}

/** Aggregate CDS pool metrics from on-chain reads */
export function usePoolMetricsAggregate() {
  const { data: poolCount } = usePoolCount();
  const count = poolCount ? Number(poolCount) : 0;

  // We return the count so the page can render individual pool readers
  return { poolCount: count };
}

/** Read single pool metrics for the analytics view */
export function usePoolAnalytics(poolAddress: Address | undefined) {
  const enabled = !!poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000";
  const { data: status } = usePoolStatus(poolAddress as Address);
  const { data: totalAssets } = useTotalAssets(poolAddress as Address);
  const { data: utilization } = useUtilizationRate(poolAddress as Address);
  const { data: spread } = useCurrentSpread(poolAddress as Address);
  const { data: totalProtection } = useTotalProtectionSold(poolAddress as Address);

  return {
    enabled,
    status: status !== undefined ? Number(status) : undefined,
    totalAssets: totalAssets ?? 0n,
    utilization: utilization ?? 0n,
    spread: spread ?? 0n,
    totalProtection: totalProtection ?? 0n,
  };
}
