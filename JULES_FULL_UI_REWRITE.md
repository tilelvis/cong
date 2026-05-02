# UI POLISH — COMPLETE FILE REPLACEMENTS
# No scrolling. Full screen layouts. Swipeable level carousel. Bigger board.
# Replace 4 files exactly as written below.

---

## FILE 1 — Replace `features/navigation/components/tab-bar.tsx` entirely

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { href: "/",        emoji: "🎮", label: "PLAY"    },
  { href: "/store",   emoji: "⚡", label: "TRIALS"  },
  { href: "/history", emoji: "📋", label: "HISTORY" },
  { href: "/profile", emoji: "👾", label: "PROFILE" },
];

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-[390px] mx-auto">
        <div
          className="flex items-center justify-around px-2 py-2"
          style={{
            background: "rgba(2, 4, 9, 0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid var(--alien-border)",
            boxShadow: "0 -1px 0 var(--alien-border-glow), 0 -8px 30px #00f0ff08",
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          }}
        >
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex flex-col items-center gap-0.5 px-4 py-1 transition-all duration-200 relative"
                style={{ minWidth: 60 }}
              >
                <span style={{ fontSize: "22px", lineHeight: 1 }}>{tab.emoji}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.1em",
                    fontSize: "9px",
                    color: isActive ? "var(--alien-plasma)" : "var(--alien-text-muted)",
                    textShadow: isActive ? "0 0 8px var(--alien-plasma)" : "none",
                  }}
                  className="uppercase transition-all duration-200"
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                    style={{
                      background: "var(--alien-plasma)",
                      boxShadow: "0 0 8px var(--alien-plasma)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

---

## FILE 2 — Replace `app/page.tsx` entirely

No scrolling. Fixed height. Level selector is a horizontal swipe carousel.
GET TRIALS link is always visible. Leaderboard removed from home (it's too long).

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useAlien } from "@alien_org/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GameBoard } from "@/components/GameBoard";
import { LEVEL_CONFIGS, type DifficultyLevel, type Puzzle, type ScoreBreakdown } from "@/lib/puzzle-engine";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Wallet {
  trials: number;
  total_points: number;
  games_won: number;
  games_played: number;
  current_streak: number;
}

interface ActiveGame {
  sessionId: string;
  level: DifficultyLevel;
  puzzle: Puzzle;
}

interface GameResult {
  won: boolean;
  score: ScoreBreakdown;
}

function getBadgeName(points: number): string {
  if (points >= 10000) return "OVERLORD";
  if (points >= 5000)  return "WARLORD";
  if (points >= 2000)  return "COMMANDER";
  if (points >= 500)   return "SOLDIER";
  if (points >= 100)   return "CADET";
  return "RECRUIT";
}

const LEVELS: DifficultyLevel[] = ["cadet", "scout", "ranger", "warlord", "phantom", "alien-mind"];

const LEVEL_BG: Record<DifficultyLevel, string> = {
  "cadet":      "linear-gradient(135deg,#001a10 0%,#003a20 100%)",
  "scout":      "linear-gradient(135deg,#001a2a 0%,#003a5a 100%)",
  "ranger":     "linear-gradient(135deg,#001a3d 0%,#003a8c 100%)",
  "warlord":    "linear-gradient(135deg,#1a1200 0%,#3a2a00 100%)",
  "phantom":    "linear-gradient(135deg,#1a0800 0%,#3a1800 100%)",
  "alien-mind": "linear-gradient(135deg,#1a0020 0%,#3a0050 100%)",
};

export default function HomePage() {
  const { authToken } = useAlien();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [trialsRemaining, setTrialsRemaining] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);

  // Touch tracking for swipe
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const selectedLevel = LEVELS[selectedIdx];
  const cfg = LEVEL_CONFIGS[selectedLevel];

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/game-wallet", {
        headers: { Authorization: `Bearer ${authToken!}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Wallet>;
    },
    enabled: !!authToken,
    refetchInterval: 30000,
  });

  const startGame = async () => {
    if (!authToken || isStarting) return;
    setIsStarting(true);
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ level: selectedLevel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to start mission");
        return;
      }
      const data = await res.json();
      setTrialsRemaining(data.trialsRemaining);
      setActiveGame({ sessionId: data.sessionId, level: selectedLevel, puzzle: data.puzzle });
      setResult(null);
    } catch {
      toast.error("Connection failure. Try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSolve = useCallback(async (params: { timeTakenMs: number; hintsUsed: number; errorCount: number }) => {
    if (!authToken || !activeGame) return;
    try {
      const res = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ sessionId: activeGame.sessionId, ...params }),
      });
      if (!res.ok) { toast.error("Failed to submit"); return; }
      const data = await res.json();
      setResult({ won: true, score: data.score });
      setActiveGame(null);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    } catch { toast.error("Network error."); }
  }, [authToken, activeGame, queryClient]);

  const handleFail = useCallback(async () => {
    if (!authToken || !activeGame) return;
    try {
      await fetch("/api/game/fail", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ sessionId: activeGame.sessionId }),
      });
    } catch {}
    setResult({ won: false, score: { base: 0, timeBonus: 0, hintPenalty: 0, errorPenalty: 0, streakBonus: 0, final: 0 } });
    setActiveGame(null);
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
  }, [authToken, activeGame, queryClient]);

  // ── RESULT SCREEN ────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px 90px" }}>
        <div className="w-full hud-card p-6 text-center space-y-4" style={{ maxWidth: 360 }}>
          <div
            className={`text-3xl font-black uppercase tracking-widest ${result.won ? "text-[var(--alien-energy)] glow-energy" : "text-[var(--alien-danger)]"}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {result.won ? "◈ MISSION SUCCESS" : "✕ MISSION FAILED"}
          </div>

          {result.won && result.score.final > 0 && (
            <div className="space-y-2 mt-2">
              {[
                { label: "BASE SCORE",    val: `+${result.score.base}`        },
                { label: "TIME BONUS",    val: `+${result.score.timeBonus}`   },
                { label: "HINT PENALTY",  val: `-${result.score.hintPenalty}` },
                { label: "ERROR PENALTY", val: `-${result.score.errorPenalty}`},
                { label: "STREAK BONUS",  val: `+${result.score.streakBonus}` },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between px-2">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }} className="text-[var(--alien-text-muted)] uppercase tracking-widest">{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }} className="text-[var(--alien-text-dim)]">{val}</span>
                </div>
              ))}
              <div className="border-t border-[var(--alien-border)] pt-2 flex justify-between px-2">
                <span style={{ fontFamily: "var(--font-display)", fontSize: "13px" }} className="text-[var(--alien-plasma)] uppercase tracking-widest">INTEL PTS</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "18px" }} className="text-[var(--alien-energy)] glow-energy font-black">{result.score.final.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setResult(null); queryClient.invalidateQueries({ queryKey: ["wallet"] }); }}
              className="flex-1 py-3 rounded-lg font-black uppercase transition-all active:scale-95"
              style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "0.2em", background: "linear-gradient(135deg,#001a3d,#003a8c)", border: "1px solid var(--alien-plasma)", color: "var(--alien-plasma)" }}
            >
              ⬡ PLAY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING SCREEN ───────────────────────────────────────────────────────────
  if (activeGame) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <button
            onClick={handleFail}
            style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
            className="text-[var(--alien-warning)] uppercase tracking-widest hover:opacity-70 transition-opacity"
          >
            ◄ ABORT
          </button>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "11px" }} className="text-[var(--alien-plasma)] glow-plasma uppercase tracking-widest">
            {activeGame.level.replace("-", " ").toUpperCase()} PROTOCOL
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }} className="text-[var(--alien-text-dim)]">
            ⬡ {trialsRemaining}
          </div>
        </div>
        {/* Board fills remaining space */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <GameBoard
            puzzle={activeGame.puzzle}
            level={activeGame.level}
            onSolve={handleSolve}
            onFail={handleFail}
          />
        </div>
      </div>
    );
  }

  // ── HOME SCREEN ──────────────────────────────────────────────────────────────
  const trials = wallet?.trials ?? 0;
  const noTrials = trials <= 0;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) < 40 || dy > 60) return; // not a horizontal swipe
    if (dx < 0) setSelectedIdx(i => Math.min(i + 1, LEVELS.length - 1));
    else        setSelectedIdx(i => Math.max(i - 1, 0));
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: 64 }}>

      {/* ── TOP: header + stats ── */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "0.2em", fontSize: "20px" }}
              className="font-black text-[var(--alien-plasma)] glow-plasma uppercase leading-none">
              CONGRUENCE
            </h1>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px" }}
              className="text-[var(--alien-text-muted)] tracking-[0.2em] uppercase mt-0.5">
              NEURAL GRID PROTOCOL v2.4
            </p>
          </div>
          <div className="text-right">
            <div style={{ fontFamily: "var(--font-display)", fontSize: "11px" }} className="text-[var(--alien-gold)] glow-gold uppercase">
              {getBadgeName(wallet?.total_points ?? 0)}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }} className="text-[var(--alien-text-muted)]">
              {(wallet?.total_points ?? 0).toLocaleString()} pts
            </div>
          </div>
        </div>

        {/* Stat row — single line */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { val: wallet?.games_played ?? 0,    label: "MISSIONS", color: "var(--alien-plasma)"  },
            { val: wallet?.games_won ?? 0,       label: "WINS",     color: "var(--alien-energy)"  },
            { val: wallet?.current_streak ?? 0,  label: "STREAK",   color: "var(--alien-gold)"    },
            { val: trials,                        label: "TRIALS",   color: "var(--alien-plasma)"  },
          ].map(({ val, label, color }) => (
            <div key={label} className="hud-card py-2 flex flex-col items-center gap-0.5">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "16px", color }} className="font-bold">{val}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px" }} className="text-[var(--alien-text-muted)] uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MIDDLE: level carousel (fills remaining space) ── */}
      <div className="flex-1 flex flex-col justify-center px-4 min-h-0">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px" }}
          className="text-[var(--alien-text-muted)] tracking-[0.35em] uppercase mb-2 text-center">
          // SWIPE TO SELECT THREAT LEVEL
        </div>

        {/* Carousel strip */}
        <div
          className="relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Cards container — translate to show selected */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              transition: "transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
              transform: `translateX(calc(50% - ${selectedIdx * (268 + 12) + 134}px))`,
              padding: "8px 0",
            }}
          >
            {LEVELS.map((lvl, i) => {
              const c = LEVEL_CONFIGS[lvl];
              const isActive = i === selectedIdx;
              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedIdx(i)}
                  style={{
                    width: 268,
                    minWidth: 268,
                    height: 160,
                    borderRadius: 16,
                    background: LEVEL_BG[lvl],
                    border: `2px solid ${isActive ? c.color : "var(--alien-border)"}`,
                    boxShadow: isActive ? `0 0 24px ${c.color}50, inset 0 0 24px ${c.color}10` : "none",
                    transform: isActive ? "scale(1)" : "scale(0.88)",
                    transition: "all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: 20,
                    opacity: isActive ? 1 : 0.55,
                  }}
                >
                  <span style={{ fontSize: 36 }}>{c.emoji}</span>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: c.color, letterSpacing: "0.15em", textShadow: `0 0 12px ${c.color}` }}>
                    {c.label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--alien-text-muted)", textAlign: "center", lineHeight: 1.6 }}>
                    {c.size}×{c.size} grid · {c.hintAllowance} hints
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: c.color, opacity: 0.8 }}>
                    {c.baseScore.toLocaleString()} BASE PTS
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {LEVELS.map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                width: i === selectedIdx ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === selectedIdx ? cfg.color : "var(--alien-border)",
                boxShadow: i === selectedIdx ? `0 0 6px ${cfg.color}` : "none",
                transition: "all 0.3s ease",
                border: "none",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── BOTTOM: launch + get trials ── */}
      <div className="shrink-0 px-4 pb-3 space-y-2">
        <button
          onClick={startGame}
          disabled={noTrials || isStarting}
          className="w-full relative overflow-hidden py-4 rounded-lg font-black uppercase transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "0.25em",
            fontSize: "13px",
            background: noTrials ? "var(--alien-surface)" : `linear-gradient(135deg, ${cfg.color}22 0%, ${cfg.color}44 50%, ${cfg.color}22 100%)`,
            border: `1px solid ${cfg.color}`,
            color: cfg.color,
            boxShadow: noTrials ? "none" : `0 0 20px ${cfg.color}40`,
          }}
        >
          <span className="shimmer absolute inset-0 pointer-events-none" />
          <span className="relative z-10">
            {isStarting ? "⚡ INITIATING..." : noTrials ? "NO TRIALS — GET MORE" : `⬡ LAUNCH MISSION · ${trials} TRIALS`}
          </span>
        </button>

        <button
          onClick={() => router.push("/store")}
          className="w-full py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98] hover:bg-[#00f0ff08]"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.2em",
            color: "var(--alien-energy)",
            border: "1px solid var(--alien-border)",
            background: "transparent",
          }}
        >
          ⚡ GET TRIALS
        </button>
      </div>
    </div>
  );
}
```

---

## FILE 3 — Replace `components/GameBoard.tsx` entirely

Full screen board. Grid fills 100% width. No dead space.

```tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Puzzle, ValidationResult } from "@/lib/puzzle-engine";
import { validateGrid, getHint, LEVEL_CONFIGS } from "@/lib/puzzle-engine";

interface GameBoardProps {
  puzzle: Puzzle;
  level: string;
  onSolve: (params: { timeTakenMs: number; hintsUsed: number; errorCount: number }) => void;
  onFail: () => void;
}

const CAGE_COLORS = [
  "var(--alien-plasma)",
  "var(--alien-energy)",
  "var(--alien-gold)",
  "var(--alien-warning)",
  "#cc44ff",
  "#ff44cc",
  "#44ccff",
  "#88ff44",
];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function GameBoard({ puzzle: initialPuzzle, level, onSolve, onFail }: GameBoardProps) {
  const [puzzle, setPuzzle] = useState<Puzzle>(initialPuzzle);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [validation, setValidation] = useState<ValidationResult>({
    isComplete: false, errors: [], cageStatuses: {},
  });
  const [noteMode, setNoteMode] = useState(false);
  const [history, setHistory] = useState<Puzzle[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const startTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridPx, setGridPx] = useState(320);

  const config = LEVEL_CONFIGS[puzzle.level as keyof typeof LEVEL_CONFIGS];
  const n = puzzle.size;
  const hintsRemaining = (config?.hintAllowance ?? 0) - hintsUsed;

  // Measure container width to fill grid
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setGridPx(Math.floor(w));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cellSize = Math.floor(gridPx / n);

  // Timer
  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [solved]);

  // Validate
  useEffect(() => {
    const result = validateGrid(puzzle);
    setValidation(result);
    if (result.isComplete && !solved) {
      setSolved(true);
      onSolve({ timeTakenMs: Date.now() - startTimeRef.current, hintsUsed, errorCount });
    }
  }, [puzzle, solved, onSolve, hintsUsed, errorCount]);

  const handleNumberInput = useCallback((num: number) => {
    if (!selected || solved) return;
    const [r, c] = selected;
    if (puzzle.grid[r][c].isGiven) return;
    setHistory(prev => [...prev.slice(-30), puzzle]);
    setPuzzle(prev => {
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: [...cell.notes] })));
      if (noteMode) {
        const notes = newGrid[r][c].notes;
        newGrid[r][c].notes = notes.includes(num) ? notes.filter(x => x !== num) : [...notes, num];
      } else {
        const rowVals = newGrid[r].map((cc, ci) => ci !== c ? cc.playerValue : 0).filter(v => v);
        const colVals = newGrid.map((rr, ri) => ri !== r ? rr[c].playerValue : 0).filter(v => v);
        if (rowVals.includes(num) || colVals.includes(num)) setErrorCount(e => e + 1);
        newGrid[r][c].playerValue = num;
        newGrid[r][c].notes = [];
      }
      return { ...prev, grid: newGrid };
    });
    if (!noteMode) {
      let found = false;
      outer: for (let rr = r; rr < n; rr++) {
        for (let cc = rr === r ? c + 1 : 0; cc < n; cc++) {
          if (!puzzle.grid[rr][cc].isGiven && puzzle.grid[rr][cc].playerValue === 0) {
            setSelected([rr, cc]); found = true; break outer;
          }
        }
      }
      if (!found) setSelected(null);
    }
  }, [selected, puzzle, solved, n, noteMode]);

  const handleErase = useCallback(() => {
    if (!selected || solved) return;
    const [r, c] = selected;
    if (puzzle.grid[r][c].isGiven) return;
    setHistory(prev => [...prev.slice(-30), puzzle]);
    setPuzzle(prev => {
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: [...cell.notes] })));
      newGrid[r][c].playerValue = 0;
      newGrid[r][c].notes = [];
      return { ...prev, grid: newGrid };
    });
  }, [selected, puzzle, solved]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    setPuzzle(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  }, [history]);

  const handleHint = useCallback(() => {
    if (hintsRemaining <= 0 || solved) return;
    const hint = getHint(puzzle);
    if (!hint) return;
    setHistory(prev => [...prev.slice(-30), puzzle]);
    setHintsUsed(h => h + 1);
    setPuzzle(prev => {
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: [...cell.notes] })));
      newGrid[hint.row][hint.col].playerValue = hint.value;
      newGrid[hint.row][hint.col].notes = [];
      return { ...prev, grid: newGrid };
    });
    setSelected([hint.row, hint.col]);
  }, [puzzle, hintsRemaining, solved]);

  function getCageBorders(r: number, c: number) {
    const cageId = puzzle.grid[r][c].cageId;
    const cage = puzzle.cages.find(cg => cg.id === cageId);
    if (!cage) return {};
    const status = validation.cageStatuses[cageId];
    const baseColor = CAGE_COLORS[cageId % CAGE_COLORS.length];
    const borderColor = status === "satisfied" ? "var(--alien-energy)"
      : status === "violated" ? "var(--alien-danger)"
      : baseColor;
    const inCage = (rr: number, cc: number) => cage.cells.some(cl => cl.row === rr && cl.col === cc);
    return {
      borderTopColor:    !inCage(r-1,c) ? borderColor : "transparent",
      borderBottomColor: !inCage(r+1,c) ? borderColor : "transparent",
      borderLeftColor:   !inCage(r,c-1) ? borderColor : "transparent",
      borderRightColor:  !inCage(r,c+1) ? borderColor : "transparent",
      borderTopWidth:    !inCage(r-1,c) ? "2px" : "0",
      borderBottomWidth: !inCage(r+1,c) ? "2px" : "0",
      borderLeftWidth:   !inCage(r,c-1) ? "2px" : "0",
      borderRightWidth:  !inCage(r,c+1) ? "2px" : "0",
    };
  }

  function isCageTopLeft(r: number, c: number): boolean {
    const cageId = puzzle.grid[r][c].cageId;
    const cage = puzzle.cages.find(cg => cg.id === cageId);
    if (!cage) return false;
    const minRow = Math.min(...cage.cells.map(cl => cl.row));
    const topCells = cage.cells.filter(cl => cl.row === minRow);
    const minCol = Math.min(...topCells.map(cl => cl.col));
    return r === minRow && c === minCol;
  }

  const errorPositions = new Set(validation.errors.map(e => `${e.row},${e.col}`));

  // Number pad: 2 rows for large grids
  const padCols = n <= 5 ? n : n <= 6 ? 6 : n <= 8 ? 4 : 5;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "4px 8px 8px" }}>

      {/* HUD row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexShrink: 0 }}>
        <div className="hud-card" style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--alien-plasma)", fontSize: 10 }}>HINTS</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--alien-plasma)", fontSize: 14 }} className="glow-plasma">{hintsRemaining}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", color: "var(--alien-text-dim)", fontSize: 14 }} className="tabular-nums">
          {formatTime(elapsed)}
        </div>
        <div className="hud-card" style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--alien-warning)", fontSize: 10 }}>ERRORS</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--alien-warning)", fontSize: 14 }}>{errorCount}</span>
        </div>
      </div>

      {/* Grid — fills all remaining width */}
      <div ref={containerRef} style={{ width: "100%", flexShrink: 0 }}>
        <div
          className="hud-card overflow-hidden"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            width: "100%",
            boxShadow: "0 0 0 1px var(--alien-border-glow), 0 0 30px #00f0ff10",
          }}
        >
          {puzzle.grid.map((row, r) =>
            row.map((cell, c) => {
              const isGiven = cell.isGiven;
              const val = cell.playerValue;
              const isSelected = selected?.[0] === r && selected?.[1] === c;
              const isHighlighted = selected != null && (selected[0] === r || selected[1] === c) && !isSelected;
              const isError = errorPositions.has(`${r},${c}`);
              const cage = puzzle.cages.find(cg => cg.id === cell.cageId);
              const showLabel = isCageTopLeft(r, c);
              const borders = getCageBorders(r, c);

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => !isGiven && setSelected([r, c])}
                  className="relative flex items-center justify-center overflow-hidden transition-colors duration-100 select-none"
                  style={{
                    aspectRatio: "1",
                    border: "1px solid var(--alien-border)",
                    borderStyle: "solid",
                    ...borders,
                    background: isSelected ? "#00f0ff18" : isHighlighted ? "#00f0ff08" : isGiven ? "var(--alien-surface)" : "var(--alien-dark)",
                    boxShadow: isSelected ? "inset 0 0 12px #00f0ff20" : "none",
                    outline: isSelected ? "1px solid var(--alien-plasma)" : "none",
                    outlineOffset: "-1px",
                  }}
                >
                  {showLabel && cage && (
                    <span
                      className="absolute top-0.5 left-0.5 leading-none pointer-events-none"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: `${Math.max(6, cellSize / 5.5)}px`,
                        color: CAGE_COLORS[cage.id % CAGE_COLORS.length],
                        textShadow: `0 0 4px ${CAGE_COLORS[cage.id % CAGE_COLORS.length]}`,
                      }}
                    >
                      ✦{cage.targetDigitSum}
                    </span>
                  )}

                  {!isGiven && val === 0 && cell.notes.length > 0 && (
                    <div className="grid grid-cols-3 gap-0 p-0.5 w-full h-full pointer-events-none absolute inset-0">
                      {Array.from({ length: n }, (_, i) => i + 1).map(num => (
                        <div key={num} style={{
                          fontSize: `${Math.max(5, cellSize / 5)}px`,
                          color: cell.notes.includes(num) ? "var(--alien-plasma)" : "transparent",
                          fontFamily: "var(--font-mono)", textAlign: "center", lineHeight: 1,
                        }}>{num}</div>
                      ))}
                    </div>
                  )}

                  {(isGiven || val !== 0) && (
                    <span
                      style={{
                        fontFamily: isGiven ? "var(--font-display)" : "var(--font-mono)",
                        fontSize: cellSize > 48 ? "18px" : cellSize > 36 ? "14px" : cellSize > 28 ? "12px" : "10px",
                        fontWeight: isGiven ? "700" : "400",
                        color: isError ? "var(--alien-danger)" : isGiven ? "var(--alien-plasma)" : "var(--alien-text)",
                        textShadow: isGiven ? "0 0 8px var(--alien-plasma-dim)" : isError ? "0 0 8px var(--alien-danger)" : "none",
                        position: "relative", zIndex: 1,
                      }}
                    >
                      {isGiven ? cell.value : val}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Number pad */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${padCols}, 1fr)`, gap: 4, marginBottom: 6, flexShrink: 0 }}>
        {Array.from({ length: n }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            className="hud-card flex items-center justify-center transition-all duration-150 hover:border-[var(--alien-plasma)] hover:bg-[#00f0ff0a] active:scale-95"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: n <= 6 ? "18px" : "15px",
              color: "var(--alien-text)",
              aspectRatio: "1",
              minHeight: n <= 6 ? 44 : 38,
              opacity: selected ? 1 : 0.4,
            }}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {[
          { label: "◄ UNDO",  action: handleUndo,                    disabled: history.length === 0, color: "var(--alien-text-dim)"    },
          { label: noteMode ? "✏ ON" : "✏ OFF", action: () => setNoteMode(!noteMode), disabled: false, color: noteMode ? "var(--alien-plasma)" : "var(--alien-text-dim)" },
          { label: "✕ ERASE", action: handleErase,                   disabled: false,                 color: "var(--alien-text-dim)"    },
          { label: `◈ HINT (${hintsRemaining})`, action: handleHint, disabled: hintsRemaining <= 0,   color: "var(--alien-warning)"     },
        ].map(({ label, action, disabled, color }) => (
          <button
            key={label}
            onClick={action}
            disabled={disabled}
            className="flex-1 hud-card py-2 transition-all duration-150 disabled:opacity-30 active:scale-95"
            style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em", color }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## FILE 4 — Replace `app/store/page.tsx` entirely

Fix the broken store page. Was importing `GameWallet` which called wrong API.
This version uses `lib/deposit-packs.ts` directly.

```tsx
"use client";

import { useCallback, useRef } from "react";
import { useAlien, usePayment } from "@alien_org/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEPOSIT_PACKS } from "@/lib/deposit-packs";
import toast from "react-hot-toast";

type DepositPack = typeof DEPOSIT_PACKS[number];

export default function StorePage() {
  const { authToken, isBridgeAvailable } = useAlien();
  const queryClient = useQueryClient();
  const activePack = useRef<DepositPack | null>(null);

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/game-wallet", { headers: { Authorization: `Bearer ${authToken!}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authToken,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["purchase-history"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-history", { headers: { Authorization: `Bearer ${authToken!}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authToken,
  });

  const onPaid = useCallback(() => {
    const pack = activePack.current;
    if (pack) toast.success(`+${pack.trials} trials incoming!`, { icon: "⚡" });
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      if (attempts >= 15) clearInterval(poll);
    }, 2000);
  }, [queryClient]);

  const { pay, isLoading: payLoading } = usePayment({
    onPaid,
    onCancelled: () => toast("Payment cancelled", { icon: "✕" }),
    onFailed: () => toast.error("Payment failed. Try again."),
  });

  const handleBuy = async (pack: DepositPack) => {
    if (!authToken) return;
    activePack.current = pack;
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ productId: pack.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to create invoice");
        return;
      }
      const data = await res.json();
      pay({ recipient: data.recipient, amount: data.amount, token: data.token, network: data.network, invoice: data.invoice, item: data.item, ...(data.test ? { test: data.test } : {}) });
    } catch {
      toast.error("Connection failure.");
    }
  };

  const trials = wallet?.trials ?? 0;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", padding: "0 16px", paddingBottom: 72 }}>

      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 12, flexShrink: 0, textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.2em" }}
          className="text-[var(--alien-plasma)] glow-plasma uppercase font-black">
          ⚡ TRIAL DEPOT
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em" }}
          className="text-[var(--alien-text-muted)] uppercase mt-1">
          PURCHASE MISSION CREDITS
        </div>
      </div>

      {/* Balance */}
      <div className="hud-card shrink-0" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} className="text-[var(--alien-text-muted)] uppercase tracking-widest">AVAILABLE TRIALS</span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 24 }} className="text-[var(--alien-energy)] glow-energy font-black">{trials}</span>
      </div>

      {/* Bridge warning */}
      {!isBridgeAvailable && (
        <div className="hud-card shrink-0" style={{ padding: 12, marginBottom: 12, borderColor: "var(--alien-warning)", display: "flex", gap: 10 }}>
          <span className="text-[var(--alien-warning)]">⚠</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13 }} className="text-[var(--alien-text-dim)]">
            Open inside the Alien app to enable payments.
          </span>
        </div>
      )}

      {/* Pack list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, flexShrink: 0 }}>
        {DEPOSIT_PACKS.map(pack => (
          <button
            key={pack.id}
            onClick={() => handleBuy(pack)}
            disabled={payLoading || !isBridgeAvailable || !authToken}
            className="hud-card w-full hover:border-[var(--alien-border-glow)] hover:bg-[#00f0ff06] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
            style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}
          >
            <span style={{ fontSize: 28 }}>⚡</span>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15 }} className="text-[var(--alien-text)] uppercase tracking-widest">
                {pack.trials} TRIALS
                {pack.bonus && <span style={{ fontSize: 10, marginLeft: 8 }} className="text-[var(--alien-energy)]">{pack.bonus}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} className="text-[var(--alien-text-muted)] mt-0.5">
                {Number(pack.amount) / 1e9} ALIEN
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14 }} className="text-[var(--alien-energy)] glow-energy font-bold shrink-0">
              {Number(pack.amount) / 1e9} ALN
            </div>
          </button>
        ))}
      </div>

      {payLoading && (
        <div className="hud-card shrink-0" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div className="w-2 h-2 rounded-full bg-[var(--alien-plasma)] alien-pulse" style={{ boxShadow: "0 0 6px var(--alien-plasma)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} className="text-[var(--alien-plasma)] uppercase tracking-widest">
            PROCESSING PAYMENT...
          </span>
        </div>
      )}

      {/* Purchase history */}
      <div className="hud-card overflow-hidden" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--alien-border)", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9 }} className="text-[var(--alien-text-dim)] uppercase tracking-[0.25em]">
            📋 ACQUISITION LOG
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {historyLoading ? (
            <div style={{ padding: 16 }}>
              {[1,2].map(i => <div key={i} className="h-10 animate-pulse border-b border-[var(--alien-border)]" />)}
            </div>
          ) : !(history as any[])?.length ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }} className="text-[var(--alien-text-muted)] uppercase tracking-widest">
                NO TRANSACTIONS ON RECORD
              </span>
            </div>
          ) : (
            (history as Array<{ invoice: string; amount: string; token: string; status: string; created_at: string; trials_credited: number | null }>).map(item => (
              <div key={item.invoice} style={{ padding: "10px 16px", borderBottom: "1px solid var(--alien-border)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: item.status === "paid" ? "var(--alien-energy)" : item.status === "failed" ? "var(--alien-danger)" : "var(--alien-text-muted)", boxShadow: item.status === "paid" ? "0 0 4px var(--alien-energy)" : "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} className="text-[var(--alien-text)] truncate">
                    {item.trials_credited ? `+${item.trials_credited} trials` : `${Number(item.amount) / 1e9} ALIEN`}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9 }} className="text-[var(--alien-text-muted)] mt-0.5">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9 }}
                  className={`uppercase tracking-widest shrink-0 ${item.status === "paid" ? "text-[var(--alien-energy)] glow-energy" : item.status === "failed" ? "text-[var(--alien-danger)]" : "text-[var(--alien-text-muted)]"}`}>
                  {item.status === "paid" ? "✓ PAID" : item.status.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## WHAT EACH FIX DOES

### Tab bar
- Icons changed from `⬡ ◈ ◉ ◌` (unreadable symbols) to `🎮 ⚡ 📋 👾` (clear emoji)
- Labels changed from BASE / DEPOT / PROFILE / INTEL → PLAY / TRIALS / HISTORY / PROFILE
- Active indicator changed from dot to a horizontal bar under the label

### Home page (`app/page.tsx`)
- `height: 100dvh` + no scroll — everything fits on screen
- Level selector replaced with horizontal swipe carousel
  - Cards translate based on `selectedIdx`
  - Touch events detect horizontal swipe and advance/retreat index
  - Dot indicators below carousel show position and are tappable
  - Each card has unique gradient background, level emoji, size, hint count, base points
  - Active card is full size; adjacent cards scale to 88% to create depth
- Stats reduced to a single compact 4-column row (no 2×2 grid taking up space)
- Header shrunk to one line with rank on the right
- Leaderboard removed from home (too tall, still available via profile)
- ⚡ GET TRIALS button always visible below launch button
- Launch button color adapts to the selected level's color

### GameBoard (`components/GameBoard.tsx`)
- `ResizeObserver` measures the actual container width — grid fills 100% width always
- `gridTemplateColumns: repeat(${n}, 1fr)` — columns stretch equally instead of fixed px
- `aspectRatio: 1` on cells — height auto-matches width
- Number pad adapts: 5 cols for n≤5, 6 for n=6, 4 for n=8 (2 rows), 5 for n=9 (2 rows)
- `flex: 1` spacer between grid and number pad pushes pad to bottom naturally
- Playing screen uses `height: 100dvh` with no overflow

### Store page (`app/store/page.tsx`)
- Completely replaced — was just `<GameWallet />` which called the wrong API
- Now reads packs from `lib/deposit-packs.ts` (correct static data)
- Calls `/api/invoices` correctly with `productId`
- Polls wallet every 2s for 30s after `onPaid` fires to catch webhook latency
- Purchase history shows inline with scrollable section taking remaining space
- `height: 100dvh` — no overflow
