/**
 * Job 1 — candidate pool (runs hourly).
 *
 * Reads ERC-8004 Identity + Reputation registries off Base mainnet and keeps
 * a pool of INTERESTING targets: agents with >= 3 feedback records AND a
 * resolvable agentURI (real drama). Enriches each with:
 *   - displayed (shiny fake) score from getSummary over all clients
 *   - reviewer addresses + feedback values/tags
 *   - funding-cluster shares (shared first funder = sybil signal)
 *   - x402/USDC volume to agentWallet (90 days)
 *   - recent USDC transfers (used later to materialize feedback files with
 *     real proofOfPayment.txHash values)
 */
import { createPublicClient, http, type Log } from "viem";
import { base } from "viem/chains";
import {
  CONFIG,
  IDENTITY_REGISTRY,
  REPUTATION_REGISTRY,
} from "../config.js";
import { identityAbi, reputationAbi, newAgentEvent } from "../abis.js";
import { resolveRegistration } from "../agenturi.js";
import { analyzeFundingClusters } from "../sybil.js";
import { usdcInboundVolume } from "../explorer.js";
import { ensureStore, readPool, writePool, type PoolAgent, type PoolState } from "../store.js";

const MAX_AGENTS_PER_RUN = Number(process.env.POOL_MAX_AGENTS ?? 25);
const MAX_FEEDBACK_PER_AGENT = Number(process.env.POOL_MAX_FEEDBACK ?? 100);
const CLIENT_TYPES = [0, 1, 2]; // "getSummary over all clients"

export function makePublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(CONFIG.baseRpcUrl),
  });
}

/** displayedScore 0-100: average of per-client calculatedRatings (ints). */
function displayedScore(cal: readonly number[]): number {
  const vals = cal.filter((v) => v > 0);
  if (!vals.length) return 0;
  const avg = Math.floor(vals.reduce((a, b) => a + b, 0) / vals.length);
  return Math.max(0, Math.min(100, avg));
}

async function collectLogsChunked(
  client: ReturnType<typeof makePublicClient>,
  fromBlock: bigint
): Promise<Log[]> {
  const latest = await client.getBlockNumber();
  const out: Log[] = [];
  const CHUNK = 50_000n;
  let start = fromBlock;
  while (start <= latest) {
    const end = start + CHUNK - 1n > latest ? latest : start + CHUNK - 1n;
    try {
      const logs = await client.getLogs({
        address: IDENTITY_REGISTRY,
        event: newAgentEvent,
        fromBlock: start,
        toBlock: end,
      });
      out.push(...logs);
    } catch {
      // Some RPCs reject large eth_getLogs ranges — halve the window.
      const mid = (start + end) / 2n;
      if (mid > start) {
        const a = await client.getLogs({ address: IDENTITY_REGISTRY, event: newAgentEvent, fromBlock: start, toBlock: mid });
        const b = await client.getLogs({ address: IDENTITY_REGISTRY, event: newAgentEvent, fromBlock: mid + 1n, toBlock: end });
        out.push(...a, ...b);
      }
    }
    start = end + 1n;
  }
  return out;
}

async function fetchFeedback(client: ReturnType<typeof makePublicClient>, agentId: bigint) {
  const feedback: PoolAgent["feedback"] = [];
  const reviewers = new Set<string>();
  for (const ct of CLIENT_TYPES) {
    let ids: readonly bigint[] = [];
    try {
      ids = (await client.readContract({
        address: REPUTATION_REGISTRY,
        abi: reputationAbi,
        functionName: "getFeedbackList",
        args: [agentId, ct],
      })) as readonly bigint[];
    } catch {
      continue;
    }
    for (const fid of ids.slice(0, MAX_FEEDBACK_PER_AGENT)) {
      try {
        const [rating, clientType, text, timestamp, paymentProofId, reviewer] =
          (await client.readContract({
            address: REPUTATION_REGISTRY,
            abi: reputationAbi,
            functionName: "getFeedback",
            args: [agentId, fid],
          })) as [number, number, string, bigint, bigint, string];
        feedback.push({
          address: reviewer.toLowerCase(),
          rating,
          text: text.slice(0, 500),
          feedbackId: fid.toString(),
          paymentProofId: paymentProofId.toString(),
          timestamp: Number(timestamp),
          ...( { clientType } as object ),
        });
        reviewers.add(reviewer.toLowerCase());
      } catch {
        /* feedback row unreadable — skip */
      }
    }
  }
  return { feedback, reviewers: [...reviewers] };
}

export async function jobPool(): Promise<void> {
  ensureStore();
  const client = makePublicClient();
  const pool = readPool();

  // Discover agents registered since the last run (or from the configured
  // deployment block on first run).
  const fromBlock = pool.lastBlock === "0"
    ? CONFIG.erc8004FromBlock
    : BigInt(pool.lastBlock) + 1n;
  console.log(`[pool] scanning NewAgent logs from block ${fromBlock}`);
  const logs = await collectLogsChunked(client, fromBlock);
  const known = new Set(pool.agents.map((a) => a.agentId));

  const candidates: { agentId: bigint; agentURI: string }[] = [];
  for (const log of logs) {
    const args = (log as any).args ?? {};
    const agentId = args.agentId as bigint | undefined;
    if (agentId === undefined) continue;
    if (known.has(agentId.toString())) continue;
    candidates.push({
      agentId,
      agentURI: String(args.agentURI ?? ""),
    });
  }
  candidates.reverse(); // newest first: the freshest drama
  const batch = candidates.slice(0, MAX_AGENTS_PER_RUN);
  console.log(`[pool] ${logs.length} logs, ${candidates.length} new, processing ${batch.length}`);

  const now = Math.floor(Date.now() / 1000);
  const since90d = now - 90 * 86400;
  let added = 0;

  for (const cand of batch) {
    try {
      // --- identity (fallback to tokenURI call if log arg empty) ----------
      let agentURI = cand.agentURI;
      let agentWallet = "";
      let owner = "";
      try {
        const ag = (await client.readContract({
          address: IDENTITY_REGISTRY,
          abi: identityAbi,
          functionName: "getAgent",
          args: [cand.agentId],
        })) as [string, string, string];
        agentWallet = ag[0];
        owner = ag[1];
        agentURI = agentURI || ag[2];
      } catch {
        try {
          agentURI = (await client.readContract({
            address: IDENTITY_REGISTRY,
            abi: identityAbi,
            functionName: "tokenURI",
            args: [cand.agentId],
          })) as string;
        } catch {
          continue;
        }
      }

      // --- registration file must RESOLVE (spec Job 1) ---------------------
      const reg = await resolveRegistration(agentURI);
      if (!reg) continue; // unresolvable -> not an interesting case

      // --- reputation summary + feedback -----------------------------------
      const summary = (await client.readContract({
        address: REPUTATION_REGISTRY,
        abi: reputationAbi,
        functionName: "getSummary",
        args: [cand.agentId, CLIENT_TYPES],
      })) as unknown as [readonly number[], readonly number[], bigint, bigint, bigint];

      const feedbackCount = Number(summary[2]);
      if (feedbackCount < 3) continue; // pool: >= 3 feedback records

      const { feedback, reviewers } = await fetchFeedback(client, cand.agentId);

      // --- forensics: funding clusters + x402 volume -----------------------
      const clusters = await analyzeFundingClusters(reviewers);

      let x402 = { volumeUsd: 0, transferCount: 0, windowDays: 90 };
      let usdcTransfers: { hash: string; from: string; ts: number }[] = [];
      if (agentWallet) {
        const vol = await usdcInboundVolume(agentWallet, since90d);
        // USDC has 6 decimals -> integer USD (whole units, R5-style ints)
        x402 = {
          volumeUsd: Number(vol.volumeMinor / 1_000_000n),
          transferCount: vol.count,
          windowDays: 90,
        };
        usdcTransfers = await recentUsdcTransfers(agentWallet, reviewers, since90d);
      }

      const agent: PoolAgent = {
        agentId: cand.agentId.toString(),
        chainId: 8453,
        agentURI,
        name: reg.name || `Agent #${cand.agentId}`,
        description: reg.description.slice(0, 300),
        compliant: reg.compliant,
        services: reg.services,
        x402Support: reg.x402Support,
        agentWallet,
        owner,
        displayedScore: displayedScore(summary[0]),
        feedbackCount,
        successfulReviews: Number(summary[3]),
        reviewers,
        feedback,
        fundingClusters: clusters.clusters,
        clusteredShareBp: clusters.clusteredShareBp,
        x402,
      };
      (agent as any).usdcTransfers = usdcTransfers;

      if (!pool.agents.some((a) => a.agentId === agent.agentId)) {
        pool.agents.push(agent);
        added += 1;
      }
    } catch (err) {
      console.warn(`[pool] agent ${cand.agentId} failed:`, (err as Error).message);
    }
  }

  const latest = await client.getBlockNumber();
  const next: PoolState = {
    updatedAt: Date.now(),
    lastBlock: latest.toString(),
    agents: pool.agents,
  };
  writePool(next);
  console.log(`[pool] done: +${added} agents, pool size ${next.agents.length}`);
}

/** Recent USDC in-transfers from pool reviewers (to materialize proofs later). */
async function recentUsdcTransfers(
  wallet: string,
  reviewers: string[],
  since: number
): Promise<{ hash: string; from: string; ts: number }[]> {
  try {
    const url =
      `${CONFIG.basescanBaseUrl}${CONFIG.basescanBaseUrl.includes("/v2/") ? `?chainid=${CONFIG.basescanChainId}&` : "?"}` +
      `module=account&action=tokentx&contractaddress=${CONFIG.usdcAddress}` +
      `&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=200&sort=desc&apikey=${CONFIG.basescanApiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const json: any = await res.json();
    if (json.status !== "1" || !Array.isArray(json.result)) return [];
    const set = new Set(reviewers.map((r) => r.toLowerCase()));
    return json.result
      .filter((t: any) =>
        t.to?.toLowerCase() === wallet.toLowerCase() &&
        set.has(String(t.from).toLowerCase()) &&
        Number(t.timeStamp) >= since
      )
      .slice(0, 50)
      .map((t: any) => ({
        hash: String(t.hash),
        from: String(t.from).toLowerCase(),
        ts: Number(t.timeStamp),
      }));
  } catch {
    return [];
  }
}
