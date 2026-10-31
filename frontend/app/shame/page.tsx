"use client";
/**
 * HALL OF SHAME — past FAKE/SUSPICIOUS verdicts as mugshot cards.
 * Screenshot-bait: the fake score they displayed vs. the evidence that
 * killed them. Cards sit slightly askew like an evidence board.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { MonoLabel, Rise, EASE } from "@/components/motion";
import { Badge, Card } from "@/components/ui";
import { SHAME_CASES, PAST_REAL_CASE, WEEKLY_EXPOSED } from "@/lib/demo-data";
import { REGISTRY_LINK } from "@/lib/base";

function Mugshot({
  c,
  i,
}: {
  c: (typeof SHAME_CASES)[number];
  i: number;
}) {
  const tilt = i % 2 === 0 ? -0.8 : 0.9;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotate: tilt * 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: (i % 3) * 0.1, duration: 0.7, ease: EASE }}
      whileHover={{ rotate: 0, y: -4 }}
    >
      <Card className="overflow-hidden">
        {/* head plate */}
        <div className="relative flex items-center gap-4 border-b border-line bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.025)_0_10px,transparent_10px_20px)] px-5 py-5">
          {/* monogram mugshot frame */}
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center border border-white/15 bg-black/60">
            <span className="text-[30px] font-medium leading-none text-ink/85">
              {c.name.slice(0, 1)}
            </span>
            <span className="mt-1.5 font-mono text-[7.5px] uppercase tracking-[0.14em] text-fake/80">
              {c.verdict}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[19px] font-medium leading-tight">{c.name}</p>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink/45">
              agent #{c.id} · day {c.days}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="tnum whitespace-nowrap font-mono text-[11.5px] text-suspicious">
                displayed {c.displayed}/100 ★
              </span>
              <span aria-hidden className="h-px w-8 bg-fake" />
              <span className="tnum whitespace-nowrap font-mono text-[11.5px] text-fake">
                jury {c.score}/100
              </span>
            </div>
          </div>
          <div className="ml-auto hidden sm:block">
            <Badge tone={c.verdict === "FAKE" ? "fake" : "suspicious"}>{c.verdict}</Badge>
          </div>
        </div>

        {/* killed by */}
        <div className="px-5 py-4">
          <MonoLabel className="text-fake/70">killed by</MonoLabel>
          <ul className="mt-2.5 space-y-1.5">
            {c.killedBy.map((k) => (
              <li
                key={k}
                className="flex items-start gap-2 font-mono text-[12px] leading-relaxed text-ink/70"
              >
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-fake" />
                {k}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">
            record {c.days} · bradbury
          </span>
          <Link
            href={REGISTRY_LINK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-cold/80 transition hover:text-cold"
          >
            verdict on explorer <ExternalLink size={11} />
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

export default function ShamePage() {
  const fakes = SHAME_CASES.length;
  return (
    <main className="relative min-h-[100dvh] pt-28">
      <div className="ambient absolute inset-0" />
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
        <Rise>
          <MonoLabel className="text-fake/80">evidence board · public record</MonoLabel>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-[clamp(36px,6vw,64px)] font-medium leading-none tracking-[-0.03em]">
              Hall of <span className="text-fake">Shame</span>
            </h1>
            <p className="tnum font-mono text-[12px] uppercase tracking-[0.16em] text-ink/55">
              {WEEKLY_EXPOSED} scammers exposed this week · {fakes} on file
            </p>
          </div>
          <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-ink/55">
            Every card here flashed a shiny reputation score — until independent
            validators re-fetched the same chain state and stamped something else.
          </p>
        </Rise>

        {/* one honest REAL case so the board isn't a witch hunt */}
        <Rise delay={0.08}>
          <Card className="mt-8 border-real/25 bg-real/[0.05] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <MonoLabel className="text-real/70">not everything is fake</MonoLabel>
                <p className="mt-1.5 text-[17px] font-medium">
                  Day {PAST_REAL_CASE.day} — {PAST_REAL_CASE.name} ·{" "}
                  <span className="text-real">VERIFIED REAL</span>
                </p>
                <p className="mt-1 font-mono text-[12px] text-ink/55">
                  displayed {PAST_REAL_CASE.displayedScore} → jury {PAST_REAL_CASE.score}/100 ·{" "}
                  {PAST_REAL_CASE.reasoning}
                </p>
              </div>
              <Badge tone="real">REAL seal</Badge>
            </div>
          </Card>
        </Rise>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {SHAME_CASES.map((c, i) => (
            <Mugshot key={c.id} c={c} i={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
