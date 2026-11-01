"use client";
/**
 * THE JURY ROOM — the "oh cool" moment.
 * 7 validator seats deliberate → evidence cards stream from the real
 * evidence_digest → the verdict stamp slams in with a screen shake.
 *
 * Demo mode plays a timed showcase; live mode polls
 * get_day_status/get_verdict every 4s and animates the real round.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SeatArc, type SeatState } from "@/components/validator-seats";
import { EvidenceCard, parseDigest } from "@/components/evidence-cards";
import { VerdictStamp, playStampSound } from "@/components/verdict-stamp";
import { MonoLabel, EASE } from "@/components/motion";
import { Badge, Button, Card } from "@/components/ui";
import { useGame, computeOutcome } from "@/lib/game-state";
import { DEMO_VERDICT } from "@/lib/demo-data";
import { IS_DEMO, fetchDayStatus, fetchVerdict } from "@/lib/contract";
import { formatCountdown, msUntilJuryTime, cn } from "@/lib/utils";
import type { VerdictKind, VerdictRecord } from "@/lib/types";

type Phase = "lobby" | "deliberation" | "evidence" | "stamp";

/** SSR-safe countdown: null on first (server-matching) render, ticks after mount. */
function JuryCountdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    setLeft(msUntilJuryTime());
    const t = setInterval(() => setLeft(msUntilJuryTime()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tnum">{left === null ? "--:--:--" : formatCountdown(left)}</span>;
}

const DEMO_LOGS = [
  "leader   : E1 tokenURI(4100277) → ipfs://Qm9x…4d2  ✓ anchored",
  "leader   : E2 registration RESOLVED · type-compliant v1",
  "leader   : E3 probing 3 endpoints … 404 / 404 / 404",
  "leader   : E4 graph: 14 reviewers → 1 first-funder (9,060 bp)",
  "leader   : LLM rubric → { verdict: \"FAKE\", score: 18 }",
  "validator: re-deriving E1–E5 from scratch …",
  "validator: score band |18−16| ≤ 10 ✓ · citations: 4 ✓",
  "consensus: enum FAKE = FAKE ✓ — Optimistic Democracy: ACCEPTED",
];

export default function JuryPage() {
  const { state, streak, settleToday } = useGame();
  const reduce = useReducedMotion();
  const filed = state.todayGuess !== null;

  const [phase, setPhase] = useState<Phase>("lobby");
  const [seats, setSeats] = useState<SeatState[]>(Array(7).fill("idle"));
  const [cards, setCards] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [soundArmed, setSoundArmed] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");
  const [liveVerdict, setLiveVerdict] = useState<VerdictRecord | null>(null);
  const timers = useRef<number[]>([]);
  const sequenceRun = useRef(false);

  const verdict: VerdictRecord = IS_DEMO
    ? DEMO_VERDICT
    : liveVerdict ?? DEMO_VERDICT;
  const digest = useMemo(() => parseDigest(verdict.evidenceDigest), [verdict.evidenceDigest]);
  const verdictKind = (verdict.verdict ?? "UNDETERMINED") as VerdictKind;

  function clearTimers() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }

  function at(ms: number, fn: () => void) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  /* ---------- live polling (contract mode) ---------- */
  useEffect(() => {
    if (IS_DEMO) return;
    let alive = true;
    const day = Math.floor(Date.now() / 1000 / 86400);
    const tick = async () => {
      const st = await fetchDayStatus(day);
      if (!alive) return;
      setLiveStatus(st);
      if (st === "final" && !liveVerdict) {
        const v = await fetchVerdict(day);
        if (alive && v?.exists) setLiveVerdict(v);
      }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- the sequence ---------- */
  const runSequence = useRef(() => {});
  runSequence.current = () => {
    if (sequenceRun.current) return;
    sequenceRun.current = true;
    clearTimers();

    if (reduce) {
      setSeats(Array(7).fill("agreed"));
      setLogs(DEMO_LOGS.slice(-3));
      setCards(digest.length);
      setPhase("stamp");
      settleToday(verdictKind);
      return;
    }

    setPhase("deliberation");
    // seats light one by one: deliberating, then gavel to "agreed"
    for (let i = 0; i < 7; i++) {
      at(350 + i * 420, () =>
        setSeats((s) => s.map((v, idx) => (idx === i ? "deliberating" : v)))
      );
      at(1500 + i * 420, () =>
        setSeats((s) => s.map((v, idx) => (idx === i ? "agreed" : v)))
      );
    }
    // log lines stream
    DEMO_LOGS.forEach((line, i) => at(500 + i * 520, () => setLogs((l) => [...l, line])));
    // evidence cards
    const evidenceStart = 4600;
    at(evidenceStart, () => setPhase("evidence"));
    digest.forEach((_, i) => at(evidenceStart + 450 + i * 480, () => setCards(i + 1)));
    // stamp
    const stampAt = evidenceStart + 650 + digest.length * 480;
    at(stampAt, () => {
      setPhase("stamp");
      setShake(true);
      settleToday(verdictKind);
      at(500, () => setShake(false));
    });
  };

  /* auto-start: demo plays the showcase; contract mode starts when final */
  useEffect(() => {
    if (IS_DEMO && filed) {
      at(400, () => runSequence.current());
      return clearTimers;
    }
    if (!IS_DEMO && liveStatus === "final") {
      runSequence.current();
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IS_DEMO, filed, liveStatus]);

  const outcome = computeOutcome(state.todayGuess, verdictKind);
  const showResult = phase === "stamp";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden pt-24">
      <div className="ambient absolute inset-0" />
      <div
        aria-hidden
        className={cn("absolute inset-0", shake && "animate-shake")}
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <MonoLabel className="text-cold/80">jury room — day 47</MonoLabel>
            <h1 className="mt-2 text-[clamp(32px,5vw,54px)] font-medium leading-none tracking-[-0.03em]">
              {phase === "stamp" ? "The jury has spoken." : "Deliberation in progress."}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {filed && (
              <Badge tone={state.todayGuess === 0 ? "real" : "fake"}>
                your guess: {state.todayGuess === 0 ? "REAL" : "FAKE"}
              </Badge>
            )}
            <button
              type="button"
              onClick={() => {
                setSoundArmed(true);
                playStampSound("fake"); // primes the AudioContext on a gesture
              }}
              className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/50 transition hover:text-ink"
            >
              sound: {soundArmed ? "on" : "tap to arm"}
            </button>
          </div>
        </div>

        {/* ---------- LOBBY ---------- */}
        {phase === "lobby" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-10"
          >
            <Card className="p-7 text-center">
              <MonoLabel>{IS_DEMO ? "demo showcase" : `contract status: ${liveStatus || "…"}`}</MonoLabel>
              {!filed ? (
                <>
                  <p className="mt-4 text-[20px] font-medium">You haven&apos;t filed a guess yet.</p>
                  <p className="mx-auto mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink/55">
                    The verdict lands in <JuryCountdown /> — but you can watch the jury
                    deliberate once you&apos;ve called it.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-[20px] font-medium">
                    Guess filed — the jury convenes at 20:00 UTC.
                  </p>
                  {!IS_DEMO && liveStatus === "open" && (
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
                      verdict in {formatCountdown(msUntilJuryTime())}
                    </p>
                  )}
                </>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/"
                  className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-[14px] transition hover:bg-surface hover:border-ink/30"
                >
                  ← Back to today&apos;s case
                </Link>
                {!filed && (
                  <Link
                    href="/"
                    className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-real"
                  >
                    File a guess
                  </Link>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ---------- DELIBERATION + EVIDENCE + STAMP ---------- */}
        {phase !== "lobby" && (
          <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
            {/* stage */}
            <Card
              className={cn(
                "relative overflow-hidden p-6 sm:p-9",
                shake && "animate-shake"
              )}
            >
              <div className="ambient absolute inset-0" />
              <div className="relative">
                <div className="mb-8 pt-4">
                  <SeatArc states={seats} />
                  <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
                    equivalence principle · leader + validator re-derive · genlayer
                    testnet bradbury
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {phase !== "stamp" ? (
                    <motion.div
                      key="progress"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-3 py-6"
                    >
                      <span className="h-2 w-2 animate-pulseDot rounded-full bg-suspicious" />
                      <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-suspicious/90">
                        {phase === "evidence"
                          ? "replaying evidence trail"
                          : "validators fetching live evidence…"}
                      </span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* evidence trail */}
                {phase === "evidence" || phase === "stamp" ? (
                  <ul className="space-y-2.5">
                    {digest.slice(0, phase === "evidence" ? cards : digest.length).map((c, i) => (
                      <EvidenceCard
                        key={c.id + i}
                        card={c}
                        index={i}
                        visible
                      />
                    ))}
                  </ul>
                ) : null}

                {/* THE STAMP */}
                {showResult && (
                  <motion.div
                    className="mt-8 border-t border-line pt-8"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex justify-center">
                      <VerdictStamp
                        verdict={verdictKind}
                        score={verdict.score ?? 0}
                        onLanded={() => {
                          if (soundArmed && verdictKind !== "UNDETERMINED") {
                            playStampSound(verdictKind === "REAL" ? "real" : "fake");
                          }
                        }}
                      />
                    </div>

                    {/* your result */}
                    <div className="mt-7 text-center">
                      {state.todayGuess === null ? (
                        <p className="text-[16px] text-ink/60">
                          You watched without guessing — the streak stays untested.
                        </p>
                      ) : outcome === 0 ? (
                        <>
                          <p className="text-[26px] font-medium text-real">
                            ✔ You caught it
                          </p>
                          <p className="tnum mt-1 font-mono text-[13px] uppercase tracking-[0.18em] text-ink/60">
                            streak: {streak} · best: {Math.max(streak, 0)}
                          </p>
                        </>
                      ) : outcome === 1 ? (
                        <>
                          <p className="text-[26px] font-medium text-fake">
                            ✘ The scammer fooled you.
                          </p>
                          <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.18em] text-ink/50">
                            {verdictKind === "SUSPICIOUS"
                              ? "suspicious counts for the doubters — review the evidence"
                              : "streak reset — review the evidence"}
                          </p>
                        </>
                      ) : (
                        <p className="text-[18px] text-ink/70">
                          Replay — no streak damage. The evidence couldn&apos;t settle it.
                        </p>
                      )}
                    </div>

                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                      <Link
                        href="/stats"
                        className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-real"
                      >
                        Share the verdict
                      </Link>
                      <Link
                        href="/shame"
                        className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-[14px] transition hover:bg-surface hover:border-ink/30"
                      >
                        Hall of Shame
                      </Link>
                      <Link
                        href="/"
                        className="rounded-full border-2 border-ink/15 px-5 py-2.5 text-[14px] transition hover:bg-surface hover:border-ink/30"
                      >
                        Back to today
                      </Link>
                    </div>

                    {/* jury reasoning — R4: cites fetched facts */}
                    {verdict.reasoning && (
                      <p className="mx-auto mt-6 max-w-[60ch] border-t border-line pt-5 text-center font-mono text-[12px] leading-relaxed text-ink/50">
                        “{verdict.reasoning}”
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            </Card>

            {/* round log */}
            <div className="flex flex-col gap-4">
              <Card className="p-5">
                <MonoLabel>consensus round — live log</MonoLabel>
                <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {logs.map((l, i) => (
                      <motion.p
                        key={i}
                        initial={reduce ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="break-words font-mono text-[11px] leading-relaxed text-ink/60"
                      >
                        {l}
                      </motion.p>
                    ))}
                  </AnimatePresence>
                  {logs.length === 0 && (
                    <p className="font-mono text-[11px] text-ink/35">
                      awaiting round start…
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <MonoLabel>jury composition</MonoLabel>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="tnum text-[34px] font-light leading-none tracking-tight">
                      1,001
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">
                      validators on bradbury
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-[22px] font-light leading-none text-cold">±10</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">
                      score band
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-[12.5px] leading-relaxed text-ink/50">
                  Each validator re-runs the entire evidence pipeline from scratch —
                  no rubber stamps, no caller-supplied “trust me” descriptions.
                </p>
              </Card>

              {phase !== "stamp" && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => runSequence.current()}
                  disabled={phase === "deliberation" || phase === "evidence"}
                >
                  {phase === "deliberation" || phase === "evidence"
                    ? "deliberating…"
                    : "Start the round"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
