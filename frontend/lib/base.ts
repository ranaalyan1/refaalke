"use client";
/**
 * base.ts — EVM reads from Base mainnet via viem (registry liveness ticker).
 * Fully optional: failures degrade to the snapshot numbers.
 */
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";

const identityAbi = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

let client: any = null;
function pc() {
  if (!client) {
    client = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org", {
        retryCount: 0, // degrade fast to fixture numbers; the ticker is optional
      }),
    });
  }
  return client;
}

/** Live count of registered ERC-8004 agents on Base (the content ticker). */
export async function fetchRegisteredCount(): Promise<number | null> {
  try {
    const n = (await pc().readContract({
      address: IDENTITY_REGISTRY,
      abi: identityAbi,
      functionName: "totalSupply",
    })) as bigint;
    return Number(n);
  } catch {
    return null;
  }
}

export const REGISTRY_LINK = `https://basescan.org/address/${IDENTITY_REGISTRY}#code`;
export const REP_REGISTRY_LINK = `https://basescan.org/address/${REPUTATION_REGISTRY}#code`;
