/**
 * genlayer.ts — GenLayer keeper client.
 *
 * Writes:
 *   commit_daily_case(day, agentId, chainId, snapshotUri)  [owner only]
 *   run_verdict(day)
 * Reads:
 *   get_day_status(day), get_verdict(day), get_case(day)
 *
 * Uses genlayer-js (createClient / readContract / writeContract /
 * waitForTransactionReceipt) per the project spec. Falls back to a read-only
 * client when no keeper key is configured (frontend-facing read paths).
 */
import { CONFIG } from "./config.js";

type GenClient = any;

let clientPromise: Promise<GenClient | null> | null = null;

export const agentCourtAbi = [
  {
    type: "function",
    name: "commit_daily_case",
    stateMutability: "nonpayable",
    inputs: [
      { name: "day", type: "uint256" },
      { name: "agent_id", type: "uint256" },
      { name: "chain_id", type: "uint256" },
      { name: "snapshot_uri", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "submit_guess",
    stateMutability: "nonpayable",
    inputs: [
      { name: "day", type: "uint256" },
      { name: "guess", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "run_verdict",
    stateMutability: "nonpayable",
    inputs: [{ name: "day", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "get_day_status",
    stateMutability: "view",
    inputs: [{ name: "day", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "get_verdict",
    stateMutability: "view",
    inputs: [{ name: "day", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "get_case",
    stateMutability: "view",
    inputs: [{ name: "day", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

async function buildClient(): Promise<GenClient | null> {
  try {
    // Imported lazily so read-only tooling works even without the dep wired.
    const { createClient } = await import("genlayer-js");
    const chains = await import("genlayer-js/chains");
    const networkName =
      CONFIG.genlayerNetwork === "asimov" ? "testnetAsimov" : "testnetBradbury";
    const chain =
      chains[networkName as keyof typeof chains] ?? chains.testnetBradbury;
    const opts: Record<string, unknown> = { chain };
    if (CONFIG.genlayerPrivateKey) {
      const { createAccount } = await import("genlayer-js");
      opts.account = createAccount(CONFIG.genlayerPrivateKey as `0x${string}`);
    }
    return createClient(opts);
  } catch (err) {
    console.warn("[genlayer] client unavailable:", (err as Error).message);
    return null;
  }
}

export async function getClient(): Promise<GenClient | null> {
  if (!clientPromise) clientPromise = buildClient();
  return clientPromise;
}

export function utcDayIndex(d: Date = new Date()): bigint {
  return BigInt(Math.floor(d.getTime() / 1000 / 86400));
}

async function writeContract(functionName: string, args: unknown[]): Promise<string> {
  const client = await getClient();
  if (!client) throw new Error("GenLayer client unavailable");
  if (!CONFIG.genlayerPrivateKey) {
    throw new Error("GENLAYER_PRIVATE_KEY required for keeper writes");
  }
  const hash = await client.writeContract({
    address: CONFIG.contractAddress,
    functionName,
    args,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    interval: 4_000,
    retries: 60,
  });
  return String(hash) + " status=" + String((receipt as any)?.status ?? "?");
}

export async function commitDailyCase(
  day: bigint,
  agentId: bigint,
  chainId: number,
  snapshotUri: string
): Promise<string> {
  return writeContract("commit_daily_case", [day, agentId, BigInt(chainId), snapshotUri]);
}

export async function runVerdict(day: bigint): Promise<string> {
  return writeContract("run_verdict", [day]);
}

export async function readContractJson(
  functionName: "get_day_status" | "get_verdict" | "get_case",
  day: bigint
): Promise<any | null> {
  try {
    const client = await getClient();
    if (!client) return null;
    const raw = await client.readContract({
      address: CONFIG.contractAddress,
      functionName,
      args: [day],
      stateStatus: "accepted",
    });
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    console.warn(`[genlayer] ${functionName} read failed:`, (err as Error).message);
    return null;
  }
}
