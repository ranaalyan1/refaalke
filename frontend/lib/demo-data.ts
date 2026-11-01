/**
 * demo-data.ts — fixtures used in DEMO MODE (no CONTRACT_ADDRESS configured)
 * and as graceful fallback when Bradbury RPC is unreachable.
 * All numbers mirror the demo script: AlphaTradeBot, 97/100 claimed,
 * endpoints dead, 14 reviewers sharing 1 funder, 0 of 89 payment proofs.
 */
import type { AgentDossier, LeaderboardRow, VerdictRecord, DayRecord } from "./types";

export const TODAY_DOSSIER: AgentDossier = {
  agentId: "4100277",
  chainId: 8453,
  name: "AlphaTradeBot",
  tagline: "Autonomous perp-market execution agent",
  skills: [
    "Executes leveraged strategies across 6 DEXs",
    "Claims 24/7 mempool-sniping alpha",
    "“Bank-grade risk engine, audited twice”",
  ],
  wallet: "0x7f3a6c9b2e81d4f05a7c9e3b1d6f4a82c05e9c21",
  displayedScore: 97,
  feedbackCount: 89,
  distinctReviewers: 14,
  maxReviewerShareBp: 6404,
  sybilClusterShareBp: 9060,
  groundedCount: 0,
  spotChecked: 3,
  x402Usd: 0,
  services: [
    { name: "MCP", endpoint: "https://alphatrade-bot.io/mcp" },
    { name: "A2A", endpoint: "https://alphatrade-bot.io/a2a" },
    { name: "HTTP", endpoint: "https://api.alphatrade-bot.io/v1" },
  ],
  compliance: "registered type v1 — file resolves",
};

export const DEMO_VERDICT: VerdictRecord = {
  exists: true,
  day: 0,
  verdict: "FAKE",
  score: 18,
  evidenceDigest: JSON.stringify([
    { id: "E1", label: "Anchored identity", fact: "tokenURI resolved ipfs://Qm9x…4d2 — owner-locked at mint" },
    { id: "E2", label: "Registration file", fact: "RESOLVED · type-compliant https://erc8004.org/registration/v1" },
    { id: "E3", label: "Endpoint liveness", fact: "MCP=404, A2A=404, HTTP=404 — 0/3 live after retry" },
    { id: "E4", label: "Reviewer graph", fact: "14 reviewers — 9,060 bp share 1 first-funder cluster" },
    { id: "E5", label: "Payment proofs", fact: "0 of 89 feedback rows carry proofOfPayment.txHash" },
    { id: "L0", label: "Jury LLM", fact: "score 18/100 — endpoints dead, x402 volume $0, sybil 90.6%" },
  ]),
  reasoning:
    "All 3 endpoints answered 404 after retry; 0 of 89 feedback files carry a payment proof; 14 reviewers collapse to 1 first funder (9,060 bp).",
  judgedAt: 0,
};

/** A previous REAL case — proves the court isn't a one-sided machine. */
export const PAST_REAL_CASE = {
  day: 46,
  name: "MCPDocs Server",
  displayedScore: 74,
  verdict: "REAL" as const,
  score: 82,
  killedBy: [
    "Registration: RESOLVED, type-compliant",
    "Endpoints: 2/2 live (200, 204) — MCP responds",
    "x402 volume: $1,240 (90d) — payment rails real",
  ],
  reasoning: "12 feedback rows, 11 carry txHash proofs; no funder cluster above 1,500 bp.",
};

export const SHAME_CASES: {
  id: string;
  name: string;
  displayed: number;
  verdict: "FAKE" | "SUSPICIOUS";
  score: number;
  days: number;
  killedBy: string[];
}[] = [
  {
    id: "4100277",
    name: "AlphaTradeBot",
    displayed: 97,
    verdict: "FAKE",
    score: 18,
    days: 47,
    killedBy: ["0 of 89 payment proofs", "14 reviewers → 1 funder", "3/3 endpoints 404"],
  },
  {
    id: "3845102",
    name: "YieldSensei Pro",
    displayed: 94,
    verdict: "FAKE",
    score: 27,
    days: 44,
    killedBy: ["tokenURI empty — no registration file", "62 feedback, 0 grounded", "sybil cluster 88%"],
  },
  {
    id: "3771044",
    name: "LiquidityLens AI",
    displayed: 91,
    verdict: "SUSPICIOUS",
    score: 64,
    days: 41,
    killedBy: ["grounded share 12% < 30%", "displayed 91 vs proofs 7/58"],
  },
  {
    id: "3620988",
    name: "GasWhisperer",
    displayed: 89,
    verdict: "FAKE",
    score: 31,
    days: 38,
    killedBy: ["endpoints time out after retry", "8 reviewers share 1 funder", "x402 volume $0"],
  },
  {
    id: "3514773",
    name: "PerpOracle Copilot",
    displayed: 87,
    verdict: "FAKE",
    score: 22,
    days: 35,
    killedBy: ["feedback files unresolvable (404)", "94 rows, 0 grounded", "owner wallet: 1 deposit ever"],
  },
  {
    id: "3411097",
    name: "SniperMCP Deluxe",
    displayed: 84,
    verdict: "SUSPICIOUS",
    score: 71,
    days: 32,
    killedBy: ["67% reviewer concentration", "proofs exist but 1 funder"],
  },
];

export const DEMO_LEADERBOARD: LeaderboardRow[] = [
  { address: "0x9c21…a4f7", wins: 41, losses: 6, streak: 5, bestStreak: 12, games: 47 },
  { address: "0x3e80…c1b9", wins: 38, losses: 9, streak: 3, bestStreak: 9, games: 47 },
  { address: "0xab55…02de", wins: 35, losses: 12, streak: 0, bestStreak: 8, games: 47 },
  { address: "0x71f2…88a0", wins: 31, losses: 16, streak: 7, bestStreak: 7, games: 47 },
  { address: "0x4d09…be13", wins: 29, losses: 18, streak: 2, bestStreak: 6, games: 47 },
  { address: "0xf8c6…9170", wins: 26, losses: 21, streak: 1, bestStreak: 5, games: 47 },
  { address: "0x22ae…5d44", wins: 24, losses: 23, streak: 4, bestStreak: 5, games: 47 },
  { address: "0x6b17…e0c8", wins: 21, losses: 26, streak: 0, bestStreak: 4, games: 47 },
  { address: "0xd390…7712", wins: 18, losses: 29, streak: 2, bestStreak: 4, games: 47 },
  { address: "0x0c4f…ba6e", wins: 15, losses: 32, streak: 1, bestStreak: 3, games: 47 },
];

/** Demo history: last 7 days (oldest → yesterday), Wordle-style grid. */
export const DEMO_HISTORY: DayRecord[] = [
  { day: 41, result: 0, guess: 1, verdict: "FAKE" },
  { day: 42, result: 1, guess: 0, verdict: "FAKE" },
  { day: 43, result: 2, guess: null, verdict: "UNDETERMINED" },
  { day: 44, result: 0, guess: 1, verdict: "FAKE" },
  { day: 45, result: 0, guess: 0, verdict: "REAL" },
  { day: 46, result: 0, guess: 1, verdict: "FAKE" },
];

export const WEEKLY_EXPOSED = 31;
