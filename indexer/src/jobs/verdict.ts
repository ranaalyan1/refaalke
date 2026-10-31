/**
 * Job 3 — verdict keeper (runs 20:00 UTC, after the guess window).
 *
 * Calls run_verdict(day), polls until day_status == final, and logs the
 * verdict + evidence digest for the frontend replay
 * (logs/daily/<day>.verdict.json).
 */
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { ensureStore } from "../store.js";
import { runVerdict, readContractJson, utcDayIndex } from "../genlayer.js";

const POLL_INTERVAL_MS = 8_000;
const MAX_POLLS = 90; // ~12 minutes: consensus rounds with LLM calls take a while

export async function jobVerdict(dayOverride?: bigint): Promise<void> {
  ensureStore();
  const day = dayOverride ?? utcDayIndex();
  const dayStr = day.toString();
  const status0 = await readContractJson("get_day_status", day);
  console.log(`[verdict] day ${dayStr} status:`, status0);

  if (status0 && status0.status === "final") {
    console.log("[verdict] already final — harvesting");
  } else if (status0 && status0.status === "open") {
    console.log("[verdict] calling run_verdict …");
    const tx = await runVerdict(day);
    console.log(`[verdict] run_verdict ok: ${tx}`);
  } else if (status0 && status0.status === "judging") {
    console.log("[verdict] round already in flight — polling");
  } else {
    console.warn("[verdict] no case for this day (get_day_status unknown) — nothing to do");
    return;
  }

  // Poll until final.
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const st = await readContractJson("get_day_status", day);
    if (st?.status === "final") break;
    if (i === MAX_POLLS - 1) {
      console.warn("[verdict] timeout waiting for final — leaving for the next run");
      return;
    }
  }

  const verdict = await readContractJson("get_verdict", day);
  const caseFile = await readContractJson("get_case", day);
  if (!verdict?.exists) {
    console.warn("[verdict] no verdict record yet");
    return;
  }

  const dailyDir = path.join(CONFIG.logDir, "daily");
  fs.mkdirSync(dailyDir, { recursive: true });
  const out = {
    day: dayStr,
    harvestedAt: new Date().toISOString(),
    case: caseFile,
    verdict,
  };
  fs.writeFileSync(
    path.join(dailyDir, `${dayStr}.verdict.json`),
    JSON.stringify(out, null, 2)
  );
  console.log(
    `[verdict] FINAL: ${verdict.verdict} score=${verdict.score} — ` +
      `logged logs/daily/${dayStr}.verdict.json`
  );
}
