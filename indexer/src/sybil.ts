/**
 * sybil.ts — funding-cluster analysis (Job 1, spec §5).
 *
 * Groups reviewers by their shared FIRST native-transfer funder and computes
 * cluster shares in basis points (integer — mirrors the contract's R5 rule).
 */
import { firstFunders } from "./explorer.js";

export interface FundingCluster {
  funder: string;
  reviewers: string[];
  /** combined share of the agent's distinct reviewers, basis points */
  shareBp: number;
}

export interface ClusterAnalysis {
  clusters: FundingCluster[];
  clusteredReviewers: number;
  /** share of reviewers that share a funder with at least one other, bp */
  clusteredShareBp: number;
}

export async function analyzeFundingClusters(
  reviewers: string[]
): Promise<ClusterAnalysis> {
  const unique = [...new Set(reviewers.map((r) => r.toLowerCase()))];
  const funderOf = await firstFunders(unique);

  // group by funder (only groups of >= 2 are "clusters")
  const byFunder = new Map<string, string[]>();
  for (const r of unique) {
    const f = funderOf.get(r) ?? r; // no data: self-reference (never clusters)
    const arr = byFunder.get(f) ?? [];
    arr.push(r);
    byFunder.set(f, arr);
  }

  const clusters: FundingCluster[] = [];
  let clustered = 0;
  for (const [funder, members] of byFunder) {
    if (members.length < 2) continue;
    clustered += members.length;
    clusters.push({
      funder,
      reviewers: members,
      shareBp: unique.length
        ? Math.floor((members.length * 10_000) / unique.length)
        : 0,
    });
  }
  clusters.sort((a, b) => b.reviewers.length - a.reviewers.length);

  return {
    clusters,
    clusteredReviewers: clustered,
    clusteredShareBp: unique.length
      ? Math.floor((clustered * 10_000) / unique.length)
      : 0,
  };
}
