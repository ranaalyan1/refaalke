/**
 * index.ts — entrypoint.
 *   npm run pool       Job 1 (candidate pool)         hourly
 *   npm run snapshot   Job 2 (daily commit)           00:05 UTC
 *   npm run verdict    Job 3 (verdict keeper)         20:00 UTC
 *   npm run schedule   all three on cron (UTC)
 */
import { startScheduler } from "./schedule.js";
import { jobPool } from "./jobs/pool.js";
import { jobSnapshot } from "./jobs/snapshot.js";
import { jobVerdict } from "./jobs/verdict.js";

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "";
  switch (cmd) {
    case "pool":
      await jobPool();
      break;
    case "snapshot":
      await jobSnapshot();
      break;
    case "verdict": {
      const dayArg = process.argv[3];
      await jobVerdict(dayArg ? BigInt(dayArg) : undefined);
      break;
    }
    case "schedule":
      startScheduler();
      break;
    default:
      console.log("usage: tsx src/index.ts <pool|snapshot|verdict [day]|schedule>");
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
