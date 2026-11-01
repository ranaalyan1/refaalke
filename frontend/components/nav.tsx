"use client";
/**
 * nav.tsx — floating sticker-bar navigation (white pill, black outline).
 * Mobile: logo + menu button opening a pastel bottom sheet.
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IS_DEMO } from "@/lib/contract";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/jury", label: "Jury" },
  { href: "/shame", label: "Shame" },
  { href: "/leaderboard", label: "Hunters" },
  { href: "/stats", label: "Stats" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
      >
        <nav className="flex w-full max-w-5xl items-center justify-between gap-3 rounded-full border-2 border-ink/12 bg-white px-3 py-2 shadow-[0_6px_24px_rgba(11,11,15,0.08)]">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full pl-2 pr-3 transition hover:bg-surface"
            aria-label="RefAalke — home"
          >
            <Logo className="flex items-center gap-2" />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] transition-colors",
                  path === l.href
                    ? "bg-fakesoft text-ink"
                    : "text-ink/60 hover:bg-surface hover:text-ink"
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {IS_DEMO && (
              <span className="hidden rounded-full border-2 border-ink/25 bg-realsoft px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink sm:block">
                Demo mode
              </span>
            )}
            <button
              type="button"
              className="hidden h-10 items-center rounded-full bg-ink px-5 text-[13px] font-medium text-white transition hover:bg-real active:scale-[0.97] sm:flex"
              onClick={() =>
                alert(
                  "Wallet connect: configure NEXT_PUBLIC_CONTRACT_ADDRESS and a GenLayer wallet to save streaks on-chain. Guests can play without one."
                )
              }
            >
              Connect
            </button>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/15 text-ink md:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 top-[76px] z-40 rounded-3xl border-2 border-ink/12 bg-white p-3 shadow-[0_12px_40px_rgba(11,11,15,0.12)] md:hidden"
          >
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-2xl px-4 py-3 text-[15px]",
                  path === l.href ? "bg-fakesoft text-ink" : "text-ink/70 hover:bg-surface"
                )}
              >
                {l.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
