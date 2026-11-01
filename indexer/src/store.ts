/**
 * store.ts — tiny JSON file store (pool state between jobs).
 */
import fs from "node:fs";
import path from "node:path";
import { CONFIG, storePath } from "./config.js";

export interface PoolReviewer {
  address: string;
  rating: number;
  text: string;
  feedbackId: string;
  paymentProofId: string;
  timestamp: number;
  fileURI?: string; // filled by Job 2 after pinning feedback files
}

export interface PoolAgent {
  agentId: string; // uint256 as decimal string (BigInt-safe)
  chainId: number;
  agentURI: string;
  name: string;
  description: string;
  compliant: boolean;
  services: { name: string; endpoint: string }[];
  x402Support: boolean;
  agentWallet: string;
  owner: string;
  /** the "shiny fake score" displayed from getSummary, 0-100 */
  displayedScore: number;
  feedbackCount: number;
  successfulReviews: number;
  reviewers: string[]; // distinct
  feedback: PoolReviewer[];
  fundingClusters: { funder: string; reviewers: string[]; shareBp: number }[];
  clusteredShareBp: number;
  x402: { volumeUsd: number; transferCount: number; windowDays: number };
  firstSeenBlock?: string;
}

export function ensureStore(): void {
  fs.mkdirSync(CONFIG.storeDir, { recursive: true });
  fs.mkdirSync(CONFIG.logDir, { recursive: true });
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    const p = path.isAbsolute(file) ? file : storePath(file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, data: unknown): void {
  ensureStore();
  const p = path.isAbsolute(file) ? file : storePath(file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

export interface PoolState {
  updatedAt: number;
  lastBlock: string;
  agents: PoolAgent[];
}

export function readPool(): PoolState {
  return readJson<PoolState>("pool.json", {
    updatedAt: 0,
    lastBlock: "0",
    agents: [],
  });
}

export function writePool(state: PoolState): void {
  writeJson("pool.json", state);
}
