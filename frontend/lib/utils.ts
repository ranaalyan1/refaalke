import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(a: string, head = 6, tail = 4): string {
  if (!a || a.length < head + tail + 2) return a;
  return `${a.slice(0, head)}…${a.slice(-tail)}`;
}

export function utcDayIndex(d: Date = new Date()): number {
  return Math.floor(d.getTime() / 1000 / 86400);
}

/** ms until 20:00 UTC today (jury time); if past, until tomorrow's 20:00. */
export function msUntilJuryTime(now: Date = new Date()): number {
  const t = new Date(now);
  t.setUTCHours(20, 0, 0, 0);
  if (t.getTime() <= now.getTime()) t.setUTCDate(t.getUTCDate() + 1);
  return t.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
