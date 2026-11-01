import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/** shadcn/ui-idiom primitives — RefAalke v2 sticker-court style. */

type BtnVariant = "real" | "fake" | "solid" | "ghost";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }
>(function Button({ className, variant = "solid", ...props }, ref) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full border-2 font-medium transition-[transform,background-color,color,border-color] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 min-h-[44px]";
  const variants: Record<BtnVariant, string> = {
    real: "bg-realsoft text-ink border-ink hover:bg-real hover:text-white",
    fake: "bg-fakesoft text-ink border-ink hover:bg-fake hover:text-white",
    solid: "bg-ink text-white border-ink hover:bg-real hover:border-real",
    ghost: "border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-white",
  };
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
});

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "cold" | "real" | "fake" | "suspicious";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "border-ink/15 bg-surface text-ink/70",
    cold: "border-ink/25 bg-realsoft text-ink",
    real: "border-real/50 bg-realsoft text-real",
    fake: "border-fake/50 bg-fakesoft text-fake",
    suspicious: "border-ink/40 bg-ink/10 text-ink",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[24px] border-2 border-ink/10 bg-card shadow-[0_6px_24px_rgba(11,11,15,0.06)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
