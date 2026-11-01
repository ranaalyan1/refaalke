import type { Config } from "tailwindcss";

/**
 * RefAalke v2 — "sticker court"
 * Palette lock: baby blue · baby pink · white · black.
 * Pastel fills, black outlines, black type. Verdicts carry the only color.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        surface: "#F4FAFD", // baby-blue mist
        pinkmist: "#FDF2F7", // baby-pink mist (section tints)
        card: "#FFFFFF",
        ink: "#0B0B0F", // black
        real: "#3B9AD9", // baby blue (readable depth)
        realsoft: "#BFE3F7",
        fake: "#EB7BA6", // baby pink (readable depth)
        fakesoft: "#F8C8DC",
        suspicious: "#0B0B0F", // black — the jury is still deciding
        cold: "#0B0B0F", // utility mono-label color
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderColor: {
        line: "rgba(11,11,15,0.12)",
      },
      keyframes: {
        shake: {
          "0%": { transform: "translate(0,0)" },
          "20%": { transform: "translate(0,-4px)" },
          "40%": { transform: "translate(3px,2px)" },
          "60%": { transform: "translate(-3px,2px)" },
          "80%": { transform: "translate(2px,-2px)" },
          "100%": { transform: "translate(0,0)" },
        },
        pulseDot: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        shake: "shake 0.35s cubic-bezier(0.22,1,0.36,1)",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
