"use client";

import { useQuery } from "@tanstack/react-query";
import { graphqlQuery } from "@/lib/graphql/client";
import { CDS_LIST_QUERY } from "@/lib/graphql/queries";

export interface IndexedCDS {
  id: string;
  cdsId: string;
  referenceVaultId: string;
  creator: string;
  buyer: string | null;
  seller: string | null;
  protectionAmount: string;
  premiumRate: string;
  maturity: string;
  status: string;
  collateralPosted: string;
  totalPremiumPaid: string;
  createdAt: string;
}

interface CDSResponse {
  cdsContracts: { items: IndexedCDS[] };
}

export function useIndexedCDS() {
  return useQuery({
    queryKey: ["indexer", "cds"],
    queryFn: () => graphqlQuery<CDSResponse>(CDS_LIST_QUERY),
    select: (data) => data.cdsContracts.items,
    refetchInterval: 10_000,
  });
}
