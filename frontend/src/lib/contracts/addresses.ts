import { type Address } from "viem";

type ContractAddresses = {
  forgeFactory: Address;
  shieldFactory: Address;
  cdsPoolFactory: Address;
  nexusHub: Address;
  nexusVault: Address;
};

const FUJI_ADDRESSES: ContractAddresses = {
  forgeFactory: (process.env.NEXT_PUBLIC_FORGE_FACTORY || "0x0000000000000000000000000000000000000000") as Address,
  shieldFactory: (process.env.NEXT_PUBLIC_SHIELD_FACTORY || "0x0000000000000000000000000000000000000000") as Address,
  cdsPoolFactory: (process.env.NEXT_PUBLIC_CDS_POOL_FACTORY || "0x0000000000000000000000000000000000000000") as Address,
  nexusHub: (process.env.NEXT_PUBLIC_NEXUS_HUB || "0x0000000000000000000000000000000000000000") as Address,
  nexusVault: (process.env.NEXT_PUBLIC_NEXUS_VAULT || "0x0000000000000000000000000000000000000000") as Address,
};

export const CHAIN_ID = 43113; // Avalanche Fuji

export function getAddresses(): ContractAddresses {
  return FUJI_ADDRESSES;
}
