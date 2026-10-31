import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/** shadcn/ui-idiom primitives, hand-rolled to the project's design tokens. */

type BtnVariant = "real" | "fake" | "solid" | "ghost";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }
>(function Button({ className, variant = "solid", ...props }, ref) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[transform,background-color,color,box-shadow] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 min-h-[44px]";
  const variants: Record<BtnVariant, string> = {
    real: "bg-real text-black hover:shadow-[0_0_28px_rgba(43,255,136,0.35)]",
    fake: "bg-fake text-white hover:shadow-[0_0_28px_rgba(255,69,58,0.35)]",
    solid: "bg-ink text-black hover:bg-white",
    ghost: "border border-line text-ink hover:bg-white/[0.06]",
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
    neutral: "border-line bg-white/[0.04] text-ink/70",
    cold: "border-cold/30 bg-cold/10 text-cold",
    real: "border-real/30 bg-real/10 text-real",
    fake: "border-fake/30 bg-fake/10 text-fake",
    suspicious: "border-suspicious/30 bg-suspicious/10 text-suspicious",
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
        "rounded-[20px] border border-line bg-card",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
