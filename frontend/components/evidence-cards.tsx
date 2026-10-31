"use client";
/**
 * evidence-cards.tsx — the evidence trail replays sequentially from the
 * verdict's evidence_digest (real fetched facts, not vibes).
 */
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { EvidenceCardData } from "@/lib/types";

function iconFor(id: string): string {
  if (id.startsWith("E1")) return "⚓";
  if (id.startsWith("E2")) return "📄";
  if (id.startsWith("E3")) return "🌐";
  if (id.startsWith("E4")) return "🕵️";
  if (id.startsWith("E5")) return "💸";
  return "⚖";
}

export function EvidenceCard({
  card,
  index,
  visible,
}: {
  card: EvidenceCardData;
  index: number;
  visible: boolean;
}) {
  const reduce = useReducedMotion();
  if (!visible) return null;
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={cn(
        "flex items-start gap-3 rounded-[14px] border border-line bg-black/45 px-4 py-3"
      )}
    >
      <span aria-hidden className="mt-[1px] text-[15px]">
        {iconFor(card.id)}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
          {String(index + 1).padStart(2, "0")} — {card.label}
        </p>
        <p className="mt-1 break-words font-mono text-[12.5px] leading-relaxed text-ink/85">
          {card.fact}
        </p>
      </div>
    </motion.li>
  );
}

export function parseDigest(json: string | undefined): EvidenceCardData[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
