/** Shared types — mirrors the AgentCourt.py storage records (snake_case free). */

export type VerdictKind = "REAL" | "SUSPICIOUS" | "FAKE" | "UNDETERMINED";

export interface EvidenceCardData {
  id: string;
  label: string;
  fact: string;
}

export interface VerdictRecord {
  exists: boolean;
  day?: number;
  verdict?: VerdictKind;
  score?: number;
  evidenceDigest?: string; // JSON of EvidenceCardData[]
  reasoning?: string;
  judgedAt?: number;
}

export interface CaseFile {
  exists: boolean;
  day?: number;
  agentId?: string;
  chainId?: number;
  snapshotUri?: string;
  committedAt?: number;
}

export interface PlayerStats {
  exists: boolean;
  address?: string;
  wins?: number;
  losses?: number;
  streak?: number;
  bestStreak?: number;
  games?: number;
  replayTokens?: number;
}

/** The daily dossier shown on the case card (snapshot / fixture). */
export interface AgentDossier {
  agentId: string;
  chainId: number;
  name: string;
  tagline: string;
  skills: string[];
  wallet: string;
  displayedScore: number; // 0-100 — the *claimed* reputation
  feedbackCount: number;
  distinctReviewers: number;
  maxReviewerShareBp: number;
  sybilClusterShareBp: number;
  groundedCount: number;
  spotChecked: number;
  x402Usd: number;
  services: { name: string; endpoint: string }[];
  compliance: string;
}

export interface DayRecord {
  /** 0 = caught (won), 1 = fooled (lost), 2 = missed (no guess) */
  result: 0 | 1 | 2;
  guess: 0 | 1 | null;
  verdict: VerdictKind;
  day: number;
}

export interface LeaderboardRow {
  address: string;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  games: number;
}
