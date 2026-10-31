"use client";
/**
 * LEADERBOARD — top hunters: wins desc, then streak desc (contract order).
 * Demo fixtures until a contract is configured; then get_leaderboard().
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { MonoLabel, Rise, EASE } from "@/components/motion";
import { Card, Badge } from "@/components/ui";
import { DEMO_LEADERBOARD } from "@/lib/demo-data";
import { fetchLeaderboard, IS_DEMO } from "@/lib/contract";
import type { LeaderboardRow } from "@/lib/types";
import { cn, truncateAddress } from "@/lib/utils";

const MEDALS = ["#E9C46A", "#C9CDD1", "#CD7F32"];

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>(DEMO_LEADERBOARD);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (IS_DEMO) return;
    fetchLeaderboard(10).then((r) => {
      if (r && r.length) {
        setRows(r);
        setLive(true);
      }
    });
  }, []);

  const podium = rows.slice(0, 3);

  return (
    <main className="relative min-h-[100dvh] pt-28">
      <div className="ambient absolute inset-0" />
      <div className="relative mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6">
        <Rise>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <MonoLabel className="text-cold/80">global ranks · wins → streak</MonoLabel>
              <h1 className="mt-2 text-[clamp(36px,6vw,64px)] font-medium leading-none tracking-[-0.03em]">
                Top <span className="text-ink/45">hunters</span>
              </h1>
            </div>
            <Badge tone={live ? "real" : "cold"}>
              {live ? "live from bradbury" : "demo standings"}
            </Badge>
          </div>
        </Rise>

        {/* podium */}
        <Rise delay={0.08}>
          <div className="mt-9 grid grid-cols-3 gap-3">
            {podium.map((r, i) => (
              <motion.div
                key={r.address}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.7, ease: EASE }}
              >
                <Card
                  className="flex h-full flex-col items-center px-3 py-6 text-center"
                  style={{ borderColor: `${MEDALS[i]}55` }}
                >
                  <span
                    className="tnum text-[clamp(34px,6vw,56px)] font-light leading-none"
                    style={{ color: MEDALS[i] }}
                  >
                    {r.wins}
                  </span>
                  <span className="label mt-2">#{i + 1} · {r.wins} caught</span>
                  <span className="mt-3 break-all font-mono text-[11px] text-ink/70">
                    {truncateAddress(r.address, 6, 4)}
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-suspicious">
                    {r.streak > 0 ? (<><Flame size={11} /> {r.streak}</>) : (<span className="text-ink/40">no streak</span>)}
                  </span>
                </Card>
              </motion.div>
            ))}
          </div>
        </Rise>

        {/* table */}
        <Rise delay={0.16}>
          <Card className="mt-5 overflow-hidden">
            <div className="grid grid-cols-[44px_1fr_64px_64px_64px] gap-2 border-b border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45 sm:grid-cols-[56px_1fr_80px_80px_80px]">
              <span>rank</span>
              <span>hunter</span>
              <span className="text-right">wins</span>
              <span className="text-right">streak</span>
              <span className="text-right">best</span>
            </div>
            {rows.map((r, i) => (
              <motion.div
                key={r.address + i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                className={cn(
                  "grid grid-cols-[44px_1fr_64px_64px_64px] items-center gap-2 border-b border-line/60 px-5 py-3.5 last:border-0 hover:bg-white/[0.03] sm:grid-cols-[56px_1fr_80px_80px_80px]",
                  i < 3 && "bg-white/[0.02]"
                )}
              >
                <span
                  className="tnum font-mono text-[13px]"
                  style={{ color: i < 3 ? MEDALS[i] : "rgba(237,235,228,0.5)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate font-mono text-[12.5px] text-ink/85">
                  {truncateAddress(r.address, 8, 6)}
                </span>
                <span className="tnum text-right text-[14px] font-medium">{r.wins}</span>
                <span className="tnum text-right text-[13px] text-suspicious">
                  {r.streak > 0 ? `🔥${r.streak}` : "—"}
                </span>
                <span className="tnum text-right text-[13px] text-ink/55">{r.bestStreak}</span>
              </motion.div>
            ))}
          </Card>
        </Rise>

        <Rise delay={0.24}>
          <p className="mt-6 max-w-[62ch] text-[13px] leading-relaxed text-ink/45">
            Sorted exactly like the contract&apos;s <code className="font-mono text-ink/70">get_leaderboard</code>:
            wins desc, then streak desc. Players who guessed and were fooled lose their
            streak; replay days (UNDETERMINED) never do.
          </p>
        </Rise>
      </div>
    </main>
  );
}
