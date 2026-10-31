/**
 * RefAalke mark — a tilting balance inside a sticker frame.
 * Baby-blue pan vs baby-pink pan; the beam tilts toward the verdict.
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="9.5"
        fill="#FFFFFF"
        stroke="#0B0B0F"
        strokeWidth="2"
      />
      {/* center post + base */}
      <path
        d="M16 8.5V23.5M11.5 24.5H20.5"
        stroke="#0B0B0F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* tilted beam */}
      <path
        d="M7.5 12.2L24.5 9.8"
        stroke="#0B0B0F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* pans — blue left, pink right */}
      <circle cx="7.5" cy="17.4" r="4.4" fill="#BFE3F7" stroke="#0B0B0F" strokeWidth="2" />
      <circle cx="24.5" cy="15" r="4.4" fill="#F8C8DC" stroke="#0B0B0F" strokeWidth="2" />
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <LogoMark />
      <span className="text-[15px] font-medium tracking-tight text-ink sm:text-[16px]">
        RefAalke
      </span>
    </span>
  );
}
