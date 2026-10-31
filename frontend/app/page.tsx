"use client";
/**
 * Home / TODAY'S CASE — the daily hook.
 * Full-height noir hero (backdrop at low opacity + scrim), then the case
 * file and the two-button choice. One idea in the first screen: today's trial.
 */
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CaseFile } from "@/components/case-file";
import { GuessButtons } from "@/components/guess-buttons";
import { MonoLabel, EASE } from "@/components/motion";
import { Badge } from "@/components/ui";
import { useGame } from "@/lib/game-state";
import { formatCountdown, msUntilJuryTime } from "@/lib/utils";
import { fetchRegisteredCount, REGISTRY_LINK } from "@/lib/base";
import { IS_DEMO } from "@/lib/contract";

function CountdownChip() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    setLeft(msUntilJuryTime());
    const t = setInterval(() => setLeft(msUntilJuryTime()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-suspicious/30 bg-suspicious/[0.07] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-suspicious/90">
      <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-suspicious" />
      jury decides in {left === null ? "--:--:--" : formatCountdown(left)}
    </span>
  );
}

function Ticker() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    fetchRegisteredCount().then(setN);
  }, []);
  return (
    <a
      href={REGISTRY_LINK}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/45 transition hover:text-ink/80"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-real" />
      {n !== null
        ? `${n.toLocaleString()} agents registered on Base — only 3–15% functional`
        : "reading ERC-8004 registry…"}
      <span aria-hidden>↗</span>
    </a>
  );
}

export default function HomePage() {
  const { dossier } = useGame();
  const reduce = useReducedMotion();

  const anim = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.85, ease: EASE, delay },
        };

  return (
    <main>
      {/* ---------------- HERO ---------------- */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        {/* backdrop: noir courtroom, subject right, type zone left */}
        <div aria-hidden className="absolute inset-0">
          <Image
            src="/hero-courtroom.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_center] opacity-[0.30]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#060607_6%,rgba(6,6,7,0.72)_50%,rgba(6,6,7,0.38)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,transparent,#060607)]" />
          <div className="ambient absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-4 pb-14 pt-32 sm:px-6 sm:pb-20">
          <motion.div {...anim(0.05)} className="flex flex-wrap items-center gap-3">
            <MonoLabel className="text-cold/80">
              daily case — day 47 · base mainnet · 0x8004:a169
            </MonoLabel>
          </motion.div>

          <motion.h1
            {...anim(0.15)}
            className="mt-5 text-[clamp(44px,8.4vw,92px)] font-medium leading-[0.96] tracking-[-0.035em]"
          >
            Real agents.
            <br />
            <span className="text-ink/45">Fake scores.</span>
          </motion.h1>

          <motion.p
            {...anim(0.28)}
            className="mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-ink/60 sm:text-[17px]"
          >
            Every day one AI agent from the live ERC-8004 registry stands trial. You
            guess. 1,001 AI jurors fetch the chain. The verdict decides your streak.
          </motion.p>

          <motion.div
            {...anim(0.4)}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <CountdownChip />
            <Badge tone="cold">verdict = evidence, not vibes</Badge>
          </motion.div>

          <motion.div {...anim(0.52)} className="mt-6">
            <Ticker />
          </motion.div>
        </div>
      </section>

      {/* ---------------- TODAY'S CASE ---------------- */}
      <section className="relative border-t border-line bg-bg">
        <div className="ambient absolute inset-0" />
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <MonoLabel>01 — today&apos;s defendant</MonoLabel>
            <CaseFile dossier={dossier} />
          </div>

          <div className="flex flex-col justify-center">
            <MonoLabel>02 — file your verdict</MonoLabel>
            <h2 className="mt-3 text-[clamp(30px,4.4vw,46px)] font-medium leading-[1.02] tracking-[-0.03em]">
              Real — <span className="text-ink/45">or fake?</span>
            </h2>
            <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-ink/55">
              Trust the shiny 97/100 badge, or your read of the room? The jury
              re-fetches registration files, endpoints, reviewer graphs and payment
              proofs — live, inside consensus.
            </p>
            <div className="mt-7">
              <GuessButtons />
            </div>

            {/* how it works — quiet strip */}
            <ol className="mt-10 space-y-3 border-t border-line pt-6">
              {[
                ["01", "Commit", "Indexer picks today's agent, pins evidence to IPFS, commits on-chain before guesses open."],
                ["02", "Deliberate", "Leader + every validator re-run the E1–E5 evidence pipeline from scratch."],
                ["03", "Stamps", "Verdict lands: streaks settle, scammers enter the Hall of Shame."],
              ].map(([n, t, d]) => (
                <li key={n} className="flex gap-4">
                  <span className="label mt-1 w-6 shrink-0 text-cold/70">{n}</span>
                  <div>
                    <p className="text-[14px] font-medium text-ink/90">{t}</p>
                    <p className="max-w-[52ch] text-[13px] leading-relaxed text-ink/50">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-line px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/40">
            REAL/FAKE — the AI agent court · built on GenLayer
          </p>
          <p className="max-w-[52ch] text-[12px] leading-relaxed text-ink/35">
            A daily game, and a Validation layer the ERC-8004 standard hasn&apos;t
            shipped yet. {IS_DEMO ? "Demo mode: fixtures are used until a contract is configured." : ""}
          </p>
        </div>
      </footer>
    </main>
  );
}
