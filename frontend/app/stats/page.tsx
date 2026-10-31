"use client";
/**
 * STATS & SHARE — Wordle-style grid, streak, canvas share PNG.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Trophy, Target, Download, Copy, RotateCcw } from "lucide-react";
import { MonoLabel, Rise, EASE } from "@/components/motion";
import { Button, Card, Badge } from "@/components/ui";
import { useGame } from "@/lib/game-state";
import { WEEKLY_EXPOSED } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const CELL: Record<number, { emoji: string; cls: string; label: string }> = {
  0: { emoji: "🟩", cls: "border-real/50 bg-real/15", label: "caught" },
  1: { emoji: "🟥", cls: "border-fake/50 bg-fake/15", label: "fooled" },
  2: { emoji: "⬜", cls: "border-line bg-white/[0.04]", label: "missed / replay" },
};

function StatBlock({
  value,
  label,
  icon,
  accent,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-ink/50">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p
        className={cn(
          "tnum mt-3 text-[clamp(34px,5vw,52px)] font-light leading-none tracking-[-0.03em]",
          accent
        )}
      >
        {value}
      </p>
    </Card>
  );
}

/** Draws the 1200×630 share card; returns a data URL. */
function drawShareCard(streak: number, wins: number, grid: number[]): string {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 630;
  const ctx = c.getContext("2d")!;
  const mono = (s: number, w = 500) => `${w} ${s}px 'JetBrains Mono', monospace`;
  const sans = (s: number, w = 500) => `${w} ${s}px 'Space Grotesk', sans-serif`;

  // background + ambient glow
  ctx.fillStyle = "#0b0b0e";
  ctx.fillRect(0, 0, 1200, 630);
  const g = ctx.createRadialGradient(600, -100, 60, 600, -100, 700);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 1164, 594);

  // eyebrow
  ctx.fillStyle = "#67E8F9";
  ctx.font = mono(20, 500);
  ctx.fillText("REAL / FAKE — AI AGENT COURT · GENLAYER", 64, 92);

  // headline (two lines)
  ctx.fillStyle = "#EDEBE4";
  ctx.font = sans(64, 500);
  ctx.fillText("I out-judged the", 64, 196);
  ctx.fillStyle = "rgba(237,235,228,0.5)";
  ctx.fillText("AI jury.", 64, 268);

  // streak + wins
  ctx.fillStyle = "#FFB020";
  ctx.font = sans(44, 500);
  ctx.fillText(`🔥 ${streak}-day streak`, 64, 354);
  ctx.fillStyle = "rgba(237,235,228,0.75)";
  ctx.font = sans(30, 400);
  ctx.fillText(`${wins} scammers caught · day 47`, 64, 404);

  // wordle grid — right column
  const cell = 62, gap = 12, x0 = 760, y0 = 150;
  const colors: Record<number, string> = { 0: "#2BFF88", 1: "#FF453A", 2: "rgba(255,255,255,0.14)" };
  grid.forEach((r, i) => {
    const x = x0 + (i % 4) * (cell + gap);
    const y = y0 + Math.floor(i / 4) * (cell + gap);
    ctx.fillStyle = colors[r] ?? colors[2];
    roundRect(ctx, x, y, cell, cell, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, cell, cell, 10);
    ctx.stroke();
  });

  // legend
  ctx.font = mono(16, 400);
  ctx.fillStyle = "rgba(237,235,228,0.45)";
  ctx.fillText("🟩 caught   🟥 fooled   ⬜ missed", x0, y0 + 2 * (cell + gap) + 34);

  // footer
  ctx.fillStyle = "rgba(237,235,228,0.4)";
  ctx.font = mono(18, 400);
  ctx.fillText("verdicts by 1,001 AI jurors · evidence, not vibes", 64, 556);

  return c.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function StatsPage() {
  const { state, streak, bestStreak, wins, losses, games, reset, day } = useGame();
  const [png, setPng] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const last7 = useMemo(
    () => state.history.slice(-7).map((r) => (r.result === 1 ? 1 : r.result === 0 ? 0 : 2)),
    [state.history]
  );
  // pad to 7 cells (left = older)
  const padded = [...Array(Math.max(0, 7 - last7.length)).fill(2), ...last7].slice(-7);

  useEffect(() => {
    try {
      setPng(drawShareCard(streak, wins, padded));
    } catch {
      /* canvas unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, wins, state.history.length]);

  async function download() {
    if (!png || !linkRef.current) return;
    linkRef.current.href = png;
    linkRef.current.download = `realorfake-day-47.png`;
    linkRef.current.click();
  }

  async function copyImage() {
    if (!png) return;
    try {
      const blob = await (await fetch(png)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      alert("Clipboard image copy isn't supported here — use Download PNG.");
    }
  }

  return (
    <main className="relative min-h-[100dvh] pt-28">
      <div className="ambient absolute inset-0" />
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
        <Rise>
          <MonoLabel className="text-cold/80">your record</MonoLabel>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-[clamp(34px,5.5vw,58px)] font-medium leading-none tracking-[-0.03em]">
              Stats <span className="text-ink/45">& share</span>
            </h1>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45 transition hover:text-ink"
            >
              <RotateCcw size={11} /> reset demo data
            </button>
          </div>
        </Rise>

        {/* stat blocks */}
        <Rise delay={0.08}>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBlock
              value={streak}
              label="current streak"
              icon={<Flame size={13} className="text-suspicious" />}
              accent="text-suspicious"
            />
            <StatBlock value={bestStreak} label="best streak" icon={<Trophy size={13} />} />
            <StatBlock value={wins} label="caught" icon={<Target size={13} className="text-real" />} accent="text-real" />
            <StatBlock
              value={losses}
              label="fooled"
              icon={<span className="text-fake">✕</span>}
              accent="text-fake"
            />
          </div>
        </Rise>

        {/* weekly counter */}
        <Rise delay={0.14}>
          <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <p className="text-[15px] text-ink/70">
              Scammers exposed this week:{" "}
              <span className="tnum text-[26px] font-medium text-fake">{WEEKLY_EXPOSED}</span>
            </p>
            <Badge tone="cold">{games} games judged · guest device</Badge>
          </Card>
        </Rise>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* wordle grid */}
          <Rise delay={0.2}>
            <Card className="p-6">
              <MonoLabel>last 7 cases</MonoLabel>
              <div className="mt-5 grid grid-cols-7 gap-2 sm:gap-2.5">
                {padded.map((r, i) => {
                  const meta = CELL[r] ?? CELL[2];
                  const rec = state.history.slice(-7)[i];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.7 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
                      className={cn(
                        "aspect-square w-full rounded-[10px] border",
                        meta.cls
                      )}
                      role="img"
                      aria-label={rec ? `Day ${rec.day}: ${meta.label}` : meta.label}
                      title={rec ? `Day ${rec.day}: ${meta.label}` : meta.label}
                    />
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5">
                {Object.entries(CELL).map(([k, v]) => (
                  <span key={k} className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                    {v.emoji} {v.label}
                  </span>
                ))}
              </div>
              <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-ink/50">
                Rules mirror the contract: a SUSPICIOUS verdict counts for FAKE-guessers;
                UNDETERMINED grants a replay token — never streak damage.
              </p>
            </Card>
          </Rise>

          {/* share card */}
          <Rise delay={0.26}>
            <Card className="p-6">
              <MonoLabel>share card</MonoLabel>
              <div className="mt-4 overflow-hidden rounded-xl border border-line bg-black">
                {png ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={png} alt="Share card preview" className="block w-full" />
                ) : (
                  <div className="flex aspect-[1200/630] items-center justify-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink/40">
                    rendering…
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={download} className="px-5 text-[14px]">
                  <Download size={14} /> Download PNG
                </Button>
                <Button variant="ghost" onClick={copyImage} className="px-5 text-[14px]">
                  <Copy size={14} /> {copied ? "Copied!" : "Copy image"}
                </Button>
              </div>
              <a
                ref={linkRef}
                href="#"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onClick={(e) => e.preventDefault()}
              >
                png
              </a>
            </Card>
          </Rise>
        </div>

        {games === 0 && (
          <Rise delay={0.3}>
            <Card className="mt-6 p-8 text-center">
              <p className="text-[18px] font-medium">No cases judged yet.</p>
              <p className="mt-2 text-[14px] text-ink/55">
                File your first verdict on today&apos;s case — the jury rooms at 20:00 UTC.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-full bg-ink px-6 py-2.5 text-[14px] font-medium text-black"
              >
                Go to today&apos;s case
              </Link>
            </Card>
          </Rise>
        )}
      </div>
    </main>
  );
}
