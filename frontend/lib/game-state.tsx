"use client";
/**
 * game-state.tsx — guest-first game state (localStorage), wallet optional.
 * Guests play immediately; connecting a wallet later syncs to on-chain stats
 * (see lib/contract.ts). Streaks are computed with the contract's own
 * settlement rules: SUSPICIOUS counts for FAKE-guessers; UNDETERMINED is a
 * replay (🟨) that never damages a streak.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DayRecord, VerdictKind } from "./types";
import { DEMO_HISTORY, TODAY_DOSSIER, DEMO_VERDICT } from "./demo-data";
import { utcDayIndex } from "./utils";

const LS_KEY = "refaalke:state:v1";
const LEGACY_LS_KEY = "realorfake:state:v1"; // pre-rename state

export interface PersistedState {
  todayGuess: 0 | 1 | null;
  todayResult: 0 | 1 | 2 | null; // filled when verdict lands
  history: DayRecord[];
}

const initialState: PersistedState = {
  todayGuess: null,
  todayResult: null,
  history: DEMO_HISTORY,
};

interface GameCtx {
  state: PersistedState;
  day: number;
  dossier: typeof TODAY_DOSSIER;
  isDemo: boolean;
  /** streak per contract rules, derived from history + today */
  streak: number;
  bestStreak: number;
  wins: number;
  losses: number;
  games: number;
  fileGuess: (g: 0 | 1) => void;
  /** demo: settle today's game locally when the fixture verdict "lands" */
  settleToday: (verdict: VerdictKind) => void;
  reset: () => void;
}

const Ctx = createContext<GameCtx | null>(null);

function load(): PersistedState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw =
      window.localStorage.getItem(LS_KEY) ??
      window.localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      ...initialState,
      ...parsed,
      history: parsed.history?.length ? parsed.history : DEMO_HISTORY,
    };
  } catch {
    return initialState;
  }
}

export function computeOutcome(
  guess: 0 | 1 | null,
  verdict: VerdictKind
): 0 | 1 | 2 | null {
  if (guess === null) return verdict === "UNDETERMINED" ? 2 : 2; // missed
  if (verdict === "UNDETERMINED") return 2; // replay — never counts as loss
  if (guess === 0 && verdict === "REAL") return 0;
  if (guess === 1 && (verdict === "FAKE" || verdict === "SUSPICIOUS")) return 0;
  return 1;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const day = useMemo(() => utcDayIndex(), []);

  useEffect(() => {
    setState(load());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* private mode — guests just play sessionless */
    }
  }, [state]);

  const fileGuess = useCallback((g: 0 | 1) => {
    setState((s) => (s.todayGuess !== null ? s : { ...s, todayGuess: g }));
  }, []);

  const settleToday = useCallback(
    (verdict: VerdictKind) => {
      setState((s) => {
        if (s.todayResult !== null) return s;
        const result = computeOutcome(s.todayGuess, verdict);
        const rec: DayRecord = {
          day,
          result: result ?? 2,
          guess: s.todayGuess,
          verdict,
        };
        return { ...s, todayResult: result, history: [...s.history, rec] };
      });
    },
    [day]
  );

  const reset = useCallback(() => {
    setState({ ...initialState, history: DEMO_HISTORY });
  }, []);

  // Derived stats — same rules as AgentCourt._settle (streak vs replay).
  const stats = useMemo(() => {
    let streak = 0;
    let wins = 0;
    let losses = 0;
    let games = 0;
    let best = 0;
    for (const r of state.history) {
      if (r.result === 2) continue; // replay/miss — no damage, no credit
      games += 1;
      if (r.result === 0) {
        wins += 1;
        streak += 1;
        best = Math.max(best, streak);
      } else {
        losses += 1;
        streak = 0;
      }
    }
    return { streak, wins, losses, games, bestStreak: best };
  }, [state.history]);

  const value: GameCtx = {
    state,
    day,
    dossier: TODAY_DOSSIER,
    isDemo: true,
    streak: stats.streak,
    bestStreak: Math.max(stats.bestStreak, stats.streak),
    wins: stats.wins,
    losses: stats.losses,
    games: stats.games,
    fileGuess,
    settleToday,
    reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGame outside GameProvider");
  return c;
}

export { DEMO_VERDICT };
