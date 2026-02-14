"use client";

import { useQuery } from "@tanstack/react-query";
import { graphqlQuery } from "@/lib/graphql/client";
import { VAULTS_QUERY, VAULT_DETAIL_QUERY } from "@/lib/graphql/queries";

export interface IndexedTranche {
  id: string;
  trancheId: number;
  tokenAddress: string;
  targetApr: string;
  allocationPct: string;
  totalInvested: string;
}

export interface IndexedVault {
  id: string;
  vaultId: string;
  originator: string;
  status: string;
  totalDeposited: string;
  totalYieldReceived: string;
  totalYieldDistributed: string;
  lastDistribution: string;
  createdAt: string;
  tranches: { items: IndexedTranche[] };
}

export interface IndexedYieldDistribution {
  id: string;
  totalYield: string;
  seniorAmount: string;
  mezzAmount: string;
  equityAmount: string;
  timestamp: string;
}

interface VaultsResponse {
  vaults: { items: IndexedVault[] };
}

interface VaultDetailResponse {
  vault: IndexedVault | null;
  yieldDistributions: { items: IndexedYieldDistribution[] };
}

export function useIndexedVaults() {
  return useQuery({
    queryKey: ["indexer", "vaults"],
    queryFn: () => graphqlQuery<VaultsResponse>(VAULTS_QUERY),
    select: (data) => data.vaults.items,
    refetchInterval: 10_000,
  });
}

export function useIndexedVaultDetail(vaultAddress: string | undefined) {
  return useQuery({
    queryKey: ["indexer", "vault", vaultAddress],
    queryFn: () =>
      graphqlQuery<VaultDetailResponse>(VAULT_DETAIL_QUERY, {
        id: vaultAddress,
      }),
    enabled: !!vaultAddress,
    refetchInterval: 10_000,
  });
}
