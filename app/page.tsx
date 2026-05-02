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
