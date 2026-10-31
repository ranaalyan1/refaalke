"use client";
/**
 * case-file.tsx — today's dossier styled as a courtroom case file.
 * This card *is* the concept, so it may live in the first viewport.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Badge, Card } from "@/components/ui";
import { MonoLabel, EASE } from "@/components/motion";
import { truncateAddress } from "@/lib/utils";
import type { AgentDossier } from "@/lib/types";

export function CaseFile({ dossier }: { dossier: AgentDossier }) {
  const reduce = useReducedMotion();
  const card = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 32, rotate: -0.6 },
        animate: { opacity: 1, y: 0, rotate: 0 },
        transition: { duration: 0.9, ease: EASE, delay: 0.35 },
      };

  return (
    <motion.div {...card} className="w-full">
      <Card className="overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        {/* docket header */}
        <div className="flex items-center justify-between border-b border-fake/25 bg-fake/[0.07] px-5 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fake">
            Case file №047 — confidential
          </p>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40 sm:block">
            ERC-8004 · Identity 0x8004…a432
          </p>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <MonoLabel>
                Agent #{dossier.agentId} · Base mainnet 8453
              </MonoLabel>
              <h2 className="mt-2 text-[clamp(26px,4vw,36px)] font-medium leading-none tracking-[-0.03em]">
                {dossier.name}
              </h2>
              <p className="mt-2 max-w-[42ch] text-[14px] leading-relaxed text-ink/55">
                {dossier.tagline}
              </p>
            </div>

            {/* claimed reputation badge — the bait */}
            <div className="relative shrink-0 rounded-2xl border border-suspicious/40 bg-suspicious/[0.08] px-4 py-3 text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-suspicious/80">
                claimed reputation
              </p>
              <p className="tnum mt-0.5 text-[34px] font-light leading-none tracking-tight text-suspicious">
                {dossier.displayedScore}
                <span className="text-[16px] opacity-70">/100 ★</span>
              </p>
              <span className="absolute -left-2 top-1/2 h-px w-[calc(100%+16px)] -rotate-6 bg-fake/70" />
            </div>
          </div>

          {/* claimed skills */}
          <ul className="mt-5 space-y-1.5">
            {dossier.skills.map((s) => (
              <li
                key={s}
                className="flex items-start gap-2 text-[13.5px] leading-snug text-ink/70"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cold" />
                {s}
              </li>
            ))}
          </ul>

          {/* metadata row */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone="cold">wallet {truncateAddress(dossier.wallet)}</Badge>
            <Badge>{dossier.feedbackCount} feedback</Badge>
            <Badge>{dossier.distinctReviewers} reviewers</Badge>
            <Badge tone={dossier.compliance.includes("resolves") ? "real" : "neutral"}>
              {dossier.compliance}
            </Badge>
          </div>

          {/* services, monospace — the endpoints the jury will probe */}
          <div className="mt-5 rounded-xl border border-line bg-black/40 p-3">
            <MonoLabel className="mb-2">declared service endpoints</MonoLabel>
            <div className="space-y-1">
              {dossier.services.map((s) => (
                <p key={s.name} className="font-mono text-[11.5px] text-ink/50">
                  <span className="text-ink/80">{s.name}</span>{" "}
                  <span className="opacity-50">→</span> {s.endpoint}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
