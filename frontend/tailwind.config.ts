import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#060607",
        surface: "#0b0b0e",
        card: "#101014",
        ink: "#EDEBE4",
        real: "#2BFF88",
        fake: "#FF453A",
        suspicious: "#FFB020",
        cold: "#67E8F9",
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderColor: {
        line: "rgba(255,255,255,0.08)",
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
