import type { Metadata, Viewport } from "next";
import "@fontsource/space-grotesk/300.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { Grain } from "@/components/grain";
import { Nav } from "@/components/nav";
import { GameProvider } from "@/lib/game-state";

export const metadata: Metadata = {
  title: "RefAalke — the AI Agent Court on GenLayer",
  description:
    "One ERC-8004 agent stands trial every day. Guess REAL or FAKE — 1,001 AI jurors fetch live chain evidence and deliver the verdict.",
  openGraph: {
    title: "RefAalke — the AI Agent Court on GenLayer",
    description:
      "Daily game + trust primitive: evidence-grounded verdicts for ERC-8004 agents.",
  },
};

export const viewport: Viewport = {
  themeColor: "#060607",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] bg-bg text-ink antialiased">
        <GameProvider>
          <Grain />
          <Nav />
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
