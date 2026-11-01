/**
 * schedule.ts — cron scheduler (Job 1 hourly, Job 2 00:05 UTC, Job 3 20:00 UTC).
 */
import cron from "node-cron";
import { jobPool } from "./jobs/pool.js";
import { jobSnapshot } from "./jobs/snapshot.js";
import { jobVerdict } from "./jobs/verdict.js";

function guard(name: string, fn: () => Promise<void>): () => void {
  return () => {
    console.log(`[cron] ${name} start ${new Date().toISOString()}`);
    fn()
      .then(() => console.log(`[cron] ${name} done`))
      .catch((err) => console.error(`[cron] ${name} FAILED:`, err));
  };
}

export function startScheduler(): void {
  cron.schedule("0 * * * *", guard("pool (hourly)", jobPool), { timezone: "UTC" });
  cron.schedule("5 0 * * *", guard("snapshot (00:05 UTC)", jobSnapshot), { timezone: "UTC" });
  cron.schedule("0 20 * * *", guard("verdict (20:00 UTC)", () => jobVerdict()), {
    timezone: "UTC",
  });
  console.log("[cron] scheduled: pool hourly · snapshot 00:05 UTC · verdict 20:00 UTC");
}
