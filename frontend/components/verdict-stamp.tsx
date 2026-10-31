"use client";
/**
 * verdict-stamp.tsx — THE moment.
 * REAL  → green wax seal, scalloped edge, pressed in with a spring.
 * FAKE  → red steel stamp, double-ruled frame, distressed tracking.
 * On landing: stage shake + a short percussive Web-Audio hit (best-effort).
 */
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { VerdictKind } from "@/lib/types";

export function playStampSound(kind: "real" | "fake") {
  try {
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    // deep thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(kind === "real" ? 180 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(kind === "real" ? 60 : 42, now + 0.18);
    gain.gain.setValueAtTime(0.33, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);

    // metallic ring for the stamp edge
    const ring = ctx.createOscillator();
    const rg = ctx.createGain();
    ring.type = "triangle";
    ring.frequency.setValueAtTime(kind === "real" ? 880 : 620, now);
    rg.gain.setValueAtTime(0.08, now + 0.02);
    rg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    ring.connect(rg).connect(ctx.destination);
    ring.start(now + 0.02);
    ring.stop(now + 0.55);
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* audio blocked — silence is fine */
  }
}

export function VerdictStamp({
  verdict,
  score,
  onLanded,
}: {
  verdict: VerdictKind;
  score: number;
  onLanded?: () => void;
}) {
  const reduce = useReducedMotion();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (!reduce && verdict !== "UNDETERMINED") {
      playStampSound(verdict === "REAL" ? "real" : "fake");
    }
    onLanded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReal = verdict === "REAL";
  const isFake = verdict === "FAKE";
  const isSusp = verdict === "SUSPICIOUS";

  const label = isReal ? "REAL" : isFake ? "FAKE" : isSusp ? "SUSPICIOUS" : "REPLAY";
  const accent = isReal
    ? "text-real"
    : isFake
      ? "text-fake"
      : isSusp
        ? "text-suspicious"
        : "text-ink/60";

  return (
    <motion.div
      initial={reduce ? false : { scale: 2.6, opacity: 0, rotate: -12 }}
      animate={
        reduce
          ? { scale: 1, opacity: 1, rotate: isReal ? -4 : -5 }
          : {
              scale: [2.6, 0.92, 1.04, 1],
              opacity: [0, 1, 1, 1],
              rotate: [isReal ? -14 : -18, isReal ? -3 : -6, isReal ? -5 : -4, isReal ? -4 : -5],
            }
      }
      transition={{ duration: 0.7, ease: EASE, times: [0, 0.55, 0.75, 1] }}
      className="flex flex-col items-center"
      role="status"
      aria-label={`Verdict: ${label}`}
    >
      {isReal ? (
        /* --- wax seal --- */
        <div className="relative">
          <div
            className="flex h-40 w-40 items-center justify-center rounded-full border-[3px] border-real/80 sm:h-48 sm:w-48"
            style={{
              background:
                "radial-gradient(circle at 34% 30%, rgba(43,255,136,0.35), rgba(43,255,136,0.08) 58%, rgba(43,255,136,0.22))",
              boxShadow:
                "0 0 60px rgba(43,255,136,0.35), inset 0 0 34px rgba(43,255,136,0.28)",
            }}
          >
            <div className="flex h-[86%] w-[86%] flex-col items-center justify-center rounded-full border border-dashed border-real/70">
              <span
                className={cn(
                  "text-[44px] font-bold leading-none tracking-[-0.02em] text-real sm:text-[54px]"
                )}
                style={{ textShadow: "0 4px 22px rgba(43,255,136,0.5)" }}
              >
                REAL
              </span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-real/80">
                sealed
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* --- steel stamp --- */
        <div
          className={cn(
            "relative border-[4px] px-7 py-4 sm:px-10 sm:py-5",
            isFake && "border-fake",
            isSusp && "border-suspicious",
            verdict === "UNDETERMINED" && "border-ink/40"
          )}
          style={{
            boxShadow: isFake
              ? "0 0 55px rgba(255,69,58,0.32), inset 0 0 26px rgba(255,69,58,0.18)"
              : isSusp
                ? "0 0 45px rgba(255,176,32,0.25)"
                : "none",
          }}
        >
          <div
            className={cn(
              "absolute inset-[5px] border",
              isFake && "border-fake/60",
              isSusp && "border-suspicious/60",
              verdict === "UNDETERMINED" && "border-ink/25"
            )}
          />
          <span
            className={cn(
              "relative block font-bold leading-none",
              accent,
              isFake && "text-[52px] tracking-[0.06em] sm:text-[68px]",
              isSusp && "text-[30px] tracking-[0.1em] sm:text-[40px]",
              verdict === "UNDETERMINED" && "text-[34px] tracking-[0.1em] sm:text-[44px]"
            )}
            style={{
              textShadow: isFake
                ? "0 4px 26px rgba(255,69,58,0.45)"
                : "0 4px 20px rgba(255,176,32,0.3)",
            }}
          >
            {label}
          </span>
        </div>
      )}

      {/* score line — integer, monospace */}
      <p className="tnum mt-5 font-mono text-[13px] uppercase tracking-[0.2em] text-ink/55">
        jury trust score{" "}
        <span className={cn("font-medium", accent)}>{score}/100</span>
      </p>
    </motion.div>
  );
}
