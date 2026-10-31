"use client";
/**
 * validator-seats.tsx — 7 animated validator seats in an arc.
 * states: idle → deliberating (amber pulse) → agreed (green) | dissented (red)
 */
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/motion";
import { cn } from "@/lib/utils";

export type SeatState = "idle" | "deliberating" | "agreed" | "dissented";

export function ValidatorSeat({
  index,
  state,
}: {
  index: number; // 0-6
  state: SeatState;
}) {
  const reduce = useReducedMotion();
  const ring =
    state === "agreed"
      ? "border-real/70 shadow-[0_0_16px_rgba(59,154,217,0.25)]"
      : state === "dissented"
        ? "border-fake/70"
        : state === "deliberating"
          ? "border-suspicious/60 shadow-[0_0_12px_rgba(11,11,15,0.12)]"
          : "border-line";

  const glyph =
    state === "agreed" ? "✓" : state === "dissented" ? "✕" : state === "deliberating" ? "…" : "—";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : index * 0.09, duration: 0.55, ease: EASE }}
      className="flex w-9 flex-col items-center gap-1.5 sm:w-14 sm:gap-2"
    >
      <div
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink/10 bg-white transition-all duration-500 sm:h-14 sm:w-14",
          ring
        )}
        aria-label={`Validator V-0${index + 1}: ${state}`}
      >
        {/* gavel tick glyph */}
        <span
          className={cn(
            "font-mono text-[11px] transition-colors duration-300 sm:text-[14px]",
            state === "agreed" && "text-real",
            state === "dissented" && "text-fake",
            state === "deliberating" && "text-suspicious",
            state === "idle" && "text-ink/30"
          )}
        >
          {glyph}
        </span>
        {/* deliberating pulse ring */}
        {state === "deliberating" && !reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-[-6px] rounded-full border border-suspicious/40"
            animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
      <span className="font-mono text-[10px] tracking-[0.14em] text-ink/40">
        V-0{index + 1}
      </span>
    </motion.div>
  );
}

/** Arc layout wrapper: 7 seats, center seat lifted. */
export function SeatArc({ states }: { states: SeatState[] }) {
  return (
    <div className="flex items-end justify-center gap-1.5 sm:gap-3">
      {states.map((s, i) => {
        const offset = Math.abs(i - 3); // 0 at center seat
        return (
          <div
            key={i}
            className={offset === 0 ? "translate-y-[-8px] sm:translate-y-[-14px]" : offset === 1 ? "translate-y-[-4px] sm:translate-y-[-6px]" : ""}
          >
            <ValidatorSeat index={i} state={s} />
          </div>
        );
      })}
    </div>
  );
}
