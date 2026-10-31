/**
 * explorer.ts — Etherscan-v2 / Basescan API helpers (rate-limited).
 *
 * Used for two forensics questions the registries cannot answer:
 *   1. Who was each reviewer's FIRST native-transfer funder?  (sybil clusters)
 *   2. How much USDC flowed to agentWallet in the last 90 days? (x402 volume)
 */
import { CONFIG } from "./config.js";

const MIN_INTERVAL_MS = 210; // stay under 5 req/s free-tier
let lastCall = 0;

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function rateLimitedGet(url: string): Promise<any | null> {
  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function apiBase(): string {
  // v2 unified endpoint (one key for all chains) — falls back to legacy v1.
  if (CONFIG.basescanBaseUrl.includes("/v2/")) {
    return `${CONFIG.basescanBaseUrl}?chainid=${CONFIG.basescanChainId}&apikey=${CONFIG.basescanApiKey}`;
  }
  return `${CONFIG.basescanBaseUrl}?apikey=${CONFIG.basescanApiKey}`;
}

/** First native ETH transfer INTO an address, from address (the "first funder"). */
export async function firstNativeFunder(
  address: string
): Promise<{ funder: string; ts: number } | null> {
  const url =
    `${apiBase()}&module=account&action=txlist&address=${address}` +
    `&startblock=0&endblock=99999999&page=1&offset=100&sort=asc`;
  const json = await rateLimitedGet(url);
  if (!json || json.status !== "1" || !Array.isArray(json.result)) return null;
  for (const tx of json.result) {
    if (tx.to?.toLowerCase() === address.toLowerCase() && BigInt(tx.value) > 0n) {
      return { funder: tx.from as string, ts: Number(tx.timeStamp) };
    }
  }
  return null;
}

/** Sum of inbound USDC transfers (integer minor units) to `wallet` since `sinceTs`. */
export async function usdcInboundVolume(
  wallet: string,
  sinceTs: number
): Promise<{ volumeMinor: bigint; count: number }> {
  const url =
    `${apiBase()}&module=account&action=tokentx&contractaddress=${CONFIG.usdcAddress}` +
    `&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=200&sort=desc`;
  const json = await rateLimitedGet(url);
  let volume = 0n;
  let count = 0;
  if (!json || json.status !== "1" || !Array.isArray(json.result)) {
    return { volumeMinor: 0n, count: 0 };
  }
  for (const tx of json.result) {
    if (tx.to?.toLowerCase() !== wallet.toLowerCase()) continue;
    if (Number(tx.timeStamp) < sinceTs) continue;
    volume += BigInt(tx.value);
    count += 1;
  }
  return { volumeMinor: volume, count };
}

/** First successful incoming native-transfer funder for many addresses (batched). */
export async function firstFunders(
  addresses: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const a of addresses) {
    const r = await firstNativeFunder(a);
    if (r) out.set(a.toLowerCase(), r.funder.toLowerCase());
  }
  return out;
}
