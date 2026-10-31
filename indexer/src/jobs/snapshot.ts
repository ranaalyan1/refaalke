/**
 * Job 2 — daily snapshot (runs 00:05 UTC).
 *
 *  1. Picks today's agent from the pool: dramatic reveals first (high
 *     displayed score + high sybil signal), rotating so a single verdict
 *     flavor doesn't dominate the week.
 *  2. Materializes per-feedback files (with real proofOfPayment.txHash where
 *     an on-chain USDC transfer matches the reviewer), pins each to IPFS.
 *  3. Builds the bulk snapshot JSON, pins it, and calls
 *     commit_daily_case(day, agentId, 8453, snapshotUri).
 */
import fs from "node:fs";
import path from "node:path";
import { CONFIG, BASE_CHAIN_ID } from "../config.js";
import { readPool, writeJson, ensureStore, type PoolAgent } from "../store.js";
import { pinJson } from "../ipfs.js";
import { commitDailyCase, readContractJson, utcDayIndex } from "../genlayer.js";

const HISTORY_FILE = "case-history.json";

interface History {
  /** agentId -> recent committed day keys (for rotation) */
  used: Record<string, string[]>;
}

function loadHistory(): History {
  ensureStore();
  try {
    const p = path.join(CONFIG.storeDir, HISTORY_FILE);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8")) as History;
  } catch {
    /* first run */
  }
  return { used: {} };
}

function saveHistory(h: History): void {
  writeJson(HISTORY_FILE, h);
}

/**
 * Drama score: displayed reputation we can puncture, weighted by sybil
 * evidence and lack of payment proofs. Rotation: agents not used in the
 * last 14 days first; ties broken deterministically by agent id.
 */
export function pickAgent(agents: PoolAgent[], history: History): PoolAgent | null {
  const nowDay = Number(utcDayIndex());
  const fresh = agents.filter((a) => {
    const days = history.used[a.agentId] ?? [];
    return !days.some((d) => nowDay - Number(d) < 14);
  });
  const pool = fresh.length ? fresh : agents;
  if (!pool.length) return null;

  const drama = (a: PoolAgent): number => {
    const groundedProxy = a.feedback.filter(
      (f) => (f as any).paymentProofId !== "0"
    ).length;
    const groundedBp = a.feedback.length
      ? Math.floor((groundedProxy * 10_000) / a.feedback.length)
      : 0;
    // high displayed score + high clustering + low grounding = drama
    return (
      a.displayedScore * 100 +
      Math.floor(a.clusteredShareBp / 100) +
      Math.floor((10_000 - groundedBp) / 100)
    );
  };
  return [...pool].sort(
    (x, y) =>
      drama(y) - drama(x) ||
      (BigInt(x.agentId) < BigInt(y.agentId) ? -1 : 1)
  )[0];
}

async function materializeFeedbackFiles(agent: PoolAgent): Promise<void> {
  const transfers: { hash: string; from: string; ts: number }[] =
    (agent as any).usdcTransfers ?? [];
  for (const f of agent.feedback.slice(0, 30)) {
    // Match the reviewer's USDC transfer near the feedback timestamp ->
    // this becomes proofOfPayment.txHash the contract spot-checks (E4).
    const match = transfers.find(
      (t) => t.from === f.address && Math.abs(t.ts - f.timestamp) <= 7 * 86400
    );
    const doc = {
      schema: "realorfake.feedback/v1",
      agentId: agent.agentId,
      feedbackId: f.feedbackId,
      reviewer: f.address,
      rating: f.rating,
      text: f.text,
      timestamp: f.timestamp,
      paymentProofId: f.paymentProofId,
      proofOfPayment: match
        ? { txHash: match.hash, asset: "USDC", network: "base" }
        : { txHash: "" },
    };
    try {
      f.fileURI = await pinJson(doc);
    } catch (err) {
      console.warn("[snapshot] feedback pin failed:", (err as Error).message);
    }
  }
}

export async function jobSnapshot(): Promise<void> {
  ensureStore();
  const day = utcDayIndex();
  const dayStr = day.toString();

  // Idempotency: skip when today's case already exists on-chain.
  const existing = await readContractJson("get_case", day);
  if (existing && existing.exists) {
    console.log(`[snapshot] day ${dayStr} already committed`, existing);
    return;
  }

  const pool = readPool();
  if (!pool.agents.length) {
    throw new Error("pool is empty — run `npm run pool` first");
  }
  const history = loadHistory();
  const pick = pickAgent(pool.agents, history);
  if (!pick) throw new Error("no candidate available");

  console.log(
    `[snapshot] day ${dayStr}: agent #${pick.agentId} "${pick.name}" ` +
      `(displayed ${pick.displayedScore}, sybil ${pick.clusteredShareBp}bp, ` +
      `${pick.feedbackCount} feedback)`
  );

  await materializeFeedbackFiles(pick);

  const snapshot = {
    schema: "realorfake.snapshot/v1",
    day: dayStr,
    takenAt: new Date().toISOString(),
    agentId: pick.agentId,
    chainId: pick.chainId,
    agentURI: pick.agentURI,
    agentWallet: pick.agentWallet,
    name: pick.name,
    description: pick.description,
    compliant: pick.compliant,
    services: pick.services,
    x402Support: pick.x402Support,
    displayedScore: pick.displayedScore,
    feedbackCount: pick.feedbackCount,
    reviewers: pick.reviewers.map((r) => ({ address: r })),
    feedback: pick.feedback,
    fundingClusters: pick.fundingClusters,
    clusteredShareBp: pick.clusteredShareBp,
    x402: pick.x402,
    usdcTransfers: ((pick as any).usdcTransfers ?? []).slice(0, 30),
  };

  const snapshotUri = await pinJson(snapshot);
  console.log(`[snapshot] pinned ${snapshotUri}`);

  // Frontend replay feed (logs/daily/<day>.case.json).
  const dailyDir = path.join(CONFIG.logDir, "daily");
  fs.mkdirSync(dailyDir, { recursive: true });
  fs.writeFileSync(path.join(dailyDir, `${dayStr}.case.json`), JSON.stringify(snapshot, null, 2));

  const tx = await commitDailyCase(
    day,
    BigInt(pick.agentId),
    pick.chainId || BASE_CHAIN_ID,
    snapshotUri
  );
  history.used[pick.agentId] = [
    ...(history.used[pick.agentId] ?? []),
    dayStr,
  ].slice(-30);
  saveHistory(history);
  console.log(`[snapshot] commit_daily_case ok: ${tx}`);
}
