"use client";
/**
 * contract.ts — genlayer-js access (createClient / readContract /
 * writeContract / waitForTransactionReceipt) with a hard demo fallback.
 *
 * Configured via NEXT_PUBLIC_CONTRACT_ADDRESS (+ optional
 * NEXT_PUBLIC_GENLAYER_NETWORK). When unset or when the RPC is unreachable,
 * the UI runs DEMO MODE against fixtures so the game remains playable.
 */
import type { CaseFile, LeaderboardRow, PlayerStats, VerdictRecord } from "./types";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "") as `0x${string}`;
const RAW_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
export const IS_DEMO = RAW_ADDRESS === "" || RAW_ADDRESS === "0x" || !RAW_ADDRESS.startsWith("0x");

export const agentCourtAbi = [
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
    name: "get_day_status",
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
  {
    type: "function",
    name: "get_verdict",
    stateMutability: "view",
    inputs: [{ name: "day", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "get_guess",
    stateMutability: "view",
    inputs: [
      { name: "day", type: "uint256" },
      { name: "player", type: "address" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "get_my_stats",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "get_leaderboard",
    stateMutability: "view",
    inputs: [{ name: "top_n", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

let clientPromise: Promise<any | null> | null = null;

async function getClient(): Promise<any | null> {
  if (IS_DEMO) return null;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const { createClient } = await import("genlayer-js");
        const chains = await import("genlayer-js/chains");
        const net = process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "testnetBradbury";
        const chain =
          (chains as any)[net === "asimov" ? "testnetAsimov" : "testnetBradbury"] ??
          chains.testnetBradbury;
        return createClient({ chain });
      } catch (err) {
        console.warn("[genlayer] client init failed, demo fallback:", err);
        return null;
      }
    })();
  }
  return clientPromise;
}

async function readJson(functionName: string, args: unknown[]): Promise<any | null> {
  try {
    const client = await getClient();
    if (!client) return null;
    const raw = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      stateStatus: "accepted",
    });
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export async function fetchDayStatus(day: number): Promise<string> {
  const r = await readJson("get_day_status", [BigInt(day)]);
  return r?.status ?? "";
}

export async function fetchCase(day: number): Promise<CaseFile | null> {
  return readJson("get_case", [BigInt(day)]);
}

export async function fetchVerdict(day: number): Promise<VerdictRecord | null> {
  return readJson("get_verdict", [BigInt(day)]);
}

export async function fetchMyStats(): Promise<PlayerStats | null> {
  return readJson("get_my_stats", []);
}

export async function fetchLeaderboard(topN = 10): Promise<LeaderboardRow[] | null> {
  const r = await readJson("get_leaderboard", [BigInt(topN)]);
  return r?.top ?? null;
}

/** Write: file a guess on-chain. Returns tx hash, or null in demo mode. */
export async function submitGuess(day: number, guess: 0 | 1): Promise<string | null> {
  if (IS_DEMO) return null;
  try {
    const client = await getClient();
    if (!client) return null;
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("No wallet provider — install a wallet to save on-chain");
    const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
    const { createClient } = await import("genlayer-js");
    const chains = await import("genlayer-js/chains");
    const net = process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "testnetBradbury";
    const chain =
      (chains as any)[net === "asimov" ? "testnetAsimov" : "testnetBradbury"] ??
      chains.testnetBradbury;
    const walletClient = createClient({
      chain,
      account: accounts[0] as `0x${string}`,
      provider: ethereum,
    });
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "submit_guess",
      args: [BigInt(day), BigInt(guess)],
      value: 0n,
    });
    await client.waitForTransactionReceipt({ hash, interval: 4_000, retries: 45 });
    return String(hash);
  } catch (err) {
    console.warn("[genlayer] submit_guess failed:", err);
    throw err;
  }
}
