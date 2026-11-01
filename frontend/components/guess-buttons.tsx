"use client";
/**
 * guess-buttons.tsx — the two-button choice. After filing, both buttons
 * collapse into the chosen chip + a link into the Jury Room.
 */
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui";
import { EASE } from "@/components/motion";
import { useGame } from "@/lib/game-state";
import { submitGuess, IS_DEMO } from "@/lib/contract";
import { cn } from "@/lib/utils";

export function GuessButtons() {
  const { state, day, fileGuess } = useGame();
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const filed = state.todayGuess !== null;

  async function choose(g: 0 | 1) {
    if (filed) return;
    setError(null);
    fileGuess(g); // optimistic — guests are always playable
    if (!IS_DEMO) {
      try {
        await submitGuess(day, g);
      } catch (e) {
        setError((e as Error).message.slice(0, 140));
      }
    }
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {!filed ? (
          <motion.div
            key="choice"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2"
          >
            <Button
              variant="real"
              className="h-14 text-[15px] font-medium tracking-tight min-[400px]:text-[16px]"
              onClick={() => choose(0)}
              aria-label="Guess REAL — the agent is real"
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-black/70" />
              IT&apos;S REAL
            </Button>
            <Button
              variant="fake"
              className="h-14 text-[15px] font-medium tracking-tight min-[400px]:text-[16px]"
              onClick={() => choose(1)}
              aria-label="Guess FAKE — the agent is fake"
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-black/70" />
              IT&apos;S FAKE
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="filed"
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex flex-col items-center gap-4 rounded-[20px] border-2 border-ink/10 bg-surface px-5 py-5 text-center"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
              verdict filed · guess locked
            </p>
            <p
              className={cn(
                "text-[26px] font-medium leading-none tracking-tight",
                state.todayGuess === 0 ? "text-real" : "text-fake"
              )}
            >
              {state.todayGuess === 0 ? "● YOU CALLED IT REAL" : "● YOU CALLED IT FAKE"}
            </p>
            <p className="max-w-[36ch] text-[14px] leading-relaxed text-ink/55">
              The jury decides at 20:00 UTC. One thousand and one AI validators are
              about to re-fetch this agent&apos;s entire life.
            </p>
            <Link
              href="/jury"
              className="rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-white transition hover:bg-real active:scale-[0.97]"
            >
              Enter the Jury Room →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-3 text-center font-mono text-[11px] text-suspicious/90">
          {error} — guess still filed locally.
        </p>
      )}
      {!filed && (
        <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink/40">
          free to play · wallet optional · jury decides 20:00 UTC
        </p>
      )}
    </div>
  );
}
