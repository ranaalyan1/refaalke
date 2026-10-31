/**
 * config.ts — environment loading with safe defaults.
 */
import "dotenv/config";
import path from "node:path";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing env ${name} (see indexer/.env.example)`);
  }
  return v;
}

export const CONFIG = {
  // Base mainnet
  baseRpcUrl: required("BASE_RPC_URL", "https://mainnet.base.org"),
  erc8004FromBlock: BigInt(process.env.ERC8004_FROM_BLOCK ?? "28800000"),
  usdcAddress: (process.env.USDC_ADDRESS ??
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913") as `0x${string}`,

  // Explorer
  basescanApiKey: process.env.BASESCAN_API_KEY ?? "",
  basescanBaseUrl: process.env.BASESCAN_BASE_URL ?? "https://api.etherscan.io/v2/api",
  basescanChainId: 8453,

  // IPFS
  pinataJwt: process.env.PINATA_JWT ?? "",
  ipfsApiUrl: process.env.IPFS_API_URL ?? "",
  ipfsGateway: process.env.IPFS_GATEWAY ?? "https://ipfs.io/ipfs/",

  // GenLayer keeper
  genlayerPrivateKey: process.env.GENLAYER_PRIVATE_KEY ?? "",
  genlayerNetwork: process.env.GENLAYER_NETWORK ?? "bradbury",
  contractAddress: (process.env.CONTRACT_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,

  // Paths
  storeDir: process.env.STORE_DIR ?? "./store",
  logDir: process.env.LOG_DIR ?? "./logs",
};

export const IDENTITY_REGISTRY =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;
export const REPUTATION_REGISTRY =
  "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as const;
export const BASE_CHAIN_ID = 8453;
export const REGISTRATION_TYPE = "https://erc8004.org/registration/v1";

export function storePath(name: string): string {
  return path.join(CONFIG.storeDir, name);
}
export function logPath(...parts: string[]): string {
  return path.join(CONFIG.logDir, ...parts);
}
