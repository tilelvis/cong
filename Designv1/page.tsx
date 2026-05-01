"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAlien } from "@alien_org/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sanitize } from "@/lib/sanitize";
import { GameBoard } from "@/components/GameBoard";
import toast from "react-hot-toast";

// ── Types ────────────────────────────────────────────────────────────────────

type Level = "cadet" | "novice" | "soldier" | "expert";

interface Wallet {
  trials: number;
  total_purchased: number;
  total_spent: number;
  total_points: number;
  novice_points: number;
  soldier_points: number;
  expert_points: number;
  games_won: number;
  games_played: number;
  current_streak: number;
  best_streak: number;
}

interface ActiveGame {
  sessionId: string;
  level: Level;
  puzzle: unknown;
}

interface ScoreBreakdown {
  base: number;
  timeBonus: number;
  hintPenalty: number;
  errorPenalty: number;
  streakBonus: number;
  final: number;
}

interface GameResult {
  won: boolean;
  score: ScoreBreakdown;
}

interface LeaderboardEntry {
  alien_id: string;
  total_points: number;
  games_won: number;
  games_played: number;
  rank: number;
}

// ── Badge helper ──────────────────────────────────────────────────────────────

function getBadgeName(points: number): string {
  if (points >= 10000) return "OVERLORD";
  if (points >= 5000) return "WARLORD";
  if (points >= 2000) return "COMMANDER";
  if (points >= 500) return "SOLDIER";
  if (points >= 100) return "CADET";
  return "RECRUIT";
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchWallet(token: string): Promise<Wallet> {
  const res = await fetch("/api/game-wallet", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch wallet");
  return res.json();
}

async function fetchLeaderboard(token: string): Promise<{ leaderboard: LeaderboardEntry[]; me: LeaderboardEntry | null }> {
  const res = await fetch("/api/leaderboard", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { authToken } = useAlien();
  const queryClient = useQueryClient();

  const [selectedLevel, setSelectedLevel] = useState<Level>("cadet");
  const [isStarting, setIsStarting] = useState(false);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [trialsRemaining, setTrialsRemaining] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchWallet(authToken!),
    enabled: !!authToken,
    refetchInterval: 30000,
  });

  const { data: lbData } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchLeaderboard(authToken!),
    enabled: !!authToken,
  });

  const leaderboard = lbData?.leaderboard ?? [];
  const myAlienId = lbData?.me?.alien_id;

  // ── Start game ──────────────────────────────────────────────────────────────

  const startGame = async () => {
    if (!authToken || isStarting) return;
    setIsStarting(true);
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
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

  // ── Solve ───────────────────────────────────────────────────────────────────

  const handleSolve = useCallback(async (params: { timeTakenMs: number; hintsUsed: number; errorCount: number }) => {
    if (!authToken || !activeGame) return;
    try {
      const res = await fetch("/api/game/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ sessionId: activeGame.sessionId, ...params }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to submit");
        return;
      }
      const data = await res.json();
      setResult({ won: true, score: data.score });
      setActiveGame(null);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch {
      toast.error("Network error on submit.");
    }
  }, [authToken, activeGame, queryClient]);

  // ── Fail / abort ────────────────────────────────────────────────────────────

  const handleFail = useCallback(async () => {
    if (!authToken || !activeGame) return;
    try {
      await fetch("/api/game/fail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ sessionId: activeGame.sessionId }),
      });
    } catch {}
    setResult({ won: false, score: { base: 0, timeBonus: 0, hintPenalty: 0, errorPenalty: 0, streakBonus: 0, final: 0 } });
    setActiveGame(null);
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
  }, [authToken, activeGame, queryClient]);

  const resetGame = () => {
    setResult(null);
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  };

  // ── RESULT SCREEN ───────────────────────────────────────────────────────────

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full hud-card border-glow p-6 text-center space-y-4">
          <div
            className={`text-3xl font-black uppercase tracking-widest ${result.won ? "text-[var(--alien-energy)] glow-energy" : "text-[var(--alien-danger)]"}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {result.won ? "◈ MISSION SUCCESS" : "✕ MISSION FAILED"}
          </div>

          {result.won && (
            <div className="space-y-3 mt-4">
              {[
                { label: "BASE SCORE", val: result.score.base.toString() },
                { label: "TIME BONUS", val: `+${result.score.timeBonus}` },
                { label: "HINT PENALTY", val: `-${result.score.hintPenalty}` },
                { label: "ERROR PENALTY", val: `-${result.score.errorPenalty}` },
                { label: "STREAK BONUS", val: `+${result.score.streakBonus}` },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center border-b border-[var(--alien-border)] pb-2">
                  <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-xs tracking-widest uppercase">{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text)] text-sm">{val}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-plasma)] text-sm uppercase tracking-widest">TOTAL</span>
                <span style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-energy)] text-2xl font-black glow-energy">{result.score.final}</span>
              </div>
            </div>
          )}

          <button
            onClick={resetGame}
            style={{ fontFamily: "var(--font-display)" }}
            className="w-full mt-4 py-3 rounded-lg border border-[var(--alien-plasma)] text-[var(--alien-plasma)] glow-plasma text-sm uppercase tracking-widest hover:bg-[#00f0ff10] transition-colors"
          >
            ◄ RETURN TO BASE
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE GAME ─────────────────────────────────────────────────────────────

  if (activeGame) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* HUD top bar */}
        <div
          className="border-b border-[var(--alien-border)] px-4 py-2.5 flex items-center justify-between"
          style={{ background: "rgba(6,13,26,0.95)", boxShadow: "0 1px 0 var(--alien-border-glow), 0 4px 20px #00f0ff08" }}
        >
          <button
            onClick={handleFail}
            style={{ fontFamily: "var(--font-mono)" }}
            className="text-[var(--alien-warning)] text-xs tracking-widest uppercase hover:opacity-70 transition-opacity"
          >
            ◄ ABORT
          </button>
          <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-plasma)] text-xs glow-plasma uppercase tracking-widest">
            {activeGame.level.toUpperCase()} PROTOCOL
          </div>
          <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-dim)] text-xs">
            ⬡ {trialsRemaining}
          </div>
        </div>

        <GameBoard
          puzzle={activeGame.puzzle}
          level={activeGame.level}
          onSolve={handleSolve}
          onFail={handleFail}
        />
      </div>
    );
  }

  // ── HOME SCREEN ─────────────────────────────────────────────────────────────

  const levelMeta: Record<Level, { grid: string; desc: string }> = {
    cadet:   { grid: "4×4", desc: "ENTRY PROTOCOL" },
    novice:  { grid: "6×6", desc: "STANDARD PROTOCOL" },
    soldier: { grid: "9×9", desc: "ADVANCED PROTOCOL" },
    expert:  { grid: "9×9", desc: "EXPERT PROTOCOL ✦" },
  };

  return (
    <div className="px-4 py-6 pb-28 space-y-5">
      {/* Header */}
      <div className="text-center pt-4 pb-2">
        <div
          className="text-5xl mb-3 alien-flicker"
          style={{ filter: "drop-shadow(0 0 24px var(--alien-plasma))" }}
        >
          🛸
        </div>
        <h1
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.2em" }}
          className="text-2xl font-black text-[var(--alien-plasma)] glow-plasma uppercase"
        >
          CONGRUENCE
        </h1>
        <p style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-dim)] text-[10px] mt-1 tracking-[0.25em] uppercase">
          NEURAL GRID PROTOCOL v2.4
        </p>
      </div>

      {/* Rank + stats */}
      <div className="hud-card p-4 space-y-4">
        {/* Clearance level */}
        <div className="text-center">
          <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[9px] tracking-[0.35em] uppercase mb-1">
            CLEARANCE LEVEL
          </div>
          <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-gold)] text-xl font-black glow-gold">
            {getBadgeName(wallet?.total_points ?? 0)}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--alien-border)]" />

        {/* 2×2 stat grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: "⬡", val: wallet?.games_played ?? 0, label: "MISSIONS", color: "var(--alien-plasma)", glow: "glow-plasma" },
            { icon: "◈", val: wallet?.games_won ?? 0, label: "VICTORIES", color: "var(--alien-energy)", glow: "glow-energy" },
            { icon: "⚡", val: wallet?.current_streak ?? 0, label: "STREAK", color: "var(--alien-gold)", glow: "glow-gold" },
            { icon: "◉", val: (wallet?.total_points ?? 0).toLocaleString(), label: "INTEL PTS", color: "var(--alien-plasma)", glow: "glow-plasma" },
          ].map(({ icon, val, label, color, glow }) => (
            <div key={label} className="bg-[var(--alien-void)] border border-[var(--alien-border)] rounded-lg p-3 flex flex-col items-center gap-1">
              <span className="text-lg" style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}>{icon}</span>
              <span style={{ fontFamily: "var(--font-mono)", color }} className={`text-xl font-bold ${glow}`}>{val}</span>
              <span style={{ fontFamily: "var(--font-body)" }} className="text-[var(--alien-text-muted)] text-[9px] tracking-widest uppercase">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Level selector */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[9px] tracking-[0.35em] uppercase px-1 mb-3">
          // SELECT THREAT LEVEL
        </div>
        <div className="space-y-2">
          {(["cadet", "novice", "soldier", "expert"] as Level[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`w-full hud-card p-3 flex items-center justify-between transition-all duration-200 ${
                selectedLevel === lvl ? "border-glow !border-[var(--alien-border-glow)]" : "opacity-60 hover:opacity-90"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-1.5 h-6 rounded-full ${selectedLevel === lvl ? "alien-pulse" : "opacity-30"}`}
                  style={{ background: selectedLevel === lvl ? "var(--alien-plasma)" : "var(--alien-text-muted)", boxShadow: selectedLevel === lvl ? "0 0 8px var(--alien-plasma)" : "none" }}
                />
                <span style={{ fontFamily: "var(--font-display)" }} className={`text-sm uppercase tracking-widest ${selectedLevel === lvl ? "text-[var(--alien-plasma)] glow-plasma" : "text-[var(--alien-text-dim)]"}`}>
                  {lvl.toUpperCase()}
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-xs">
                {levelMeta[lvl].grid} · {levelMeta[lvl].desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Launch button */}
      <button
        onClick={startGame}
        disabled={!wallet || wallet.trials <= 0 || isStarting}
        className="w-full relative overflow-hidden py-4 rounded-lg font-black uppercase transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "0.25em",
          fontSize: "13px",
          background: "linear-gradient(135deg, #001a3d 0%, #003a8c 50%, #001a3d 100%)",
          border: "1px solid var(--alien-plasma)",
          color: "var(--alien-plasma)",
          boxShadow: "0 0 20px var(--alien-plasma-dim), inset 0 0 20px #00f0ff10",
        }}
      >
        <span className="shimmer absolute inset-0 pointer-events-none" />
        <span className="relative z-10">
          {isStarting ? "⚡ INITIATING..." : `⬡ LAUNCH MISSION · ${wallet?.trials ?? 0} TRIALS`}
        </span>
      </button>

      {/* Trial bar */}
      <div className="flex items-center justify-center gap-2">
        <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[9px] tracking-widest uppercase">
          TRIAL CREDITS
        </span>
        <div className="flex gap-0.5 items-end">
          {Array.from({ length: Math.min(wallet?.trials ?? 0, 10) }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-3 bg-[var(--alien-plasma)] rounded-sm alien-pulse"
              style={{
                animationDelay: `${i * 0.12}s`,
                opacity: 0.85,
                boxShadow: "0 0 4px var(--alien-plasma)",
              }}
            />
          ))}
          {(wallet?.trials ?? 0) > 10 && (
            <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-plasma)] text-xs ml-1">
              +{(wallet?.trials ?? 0) - 10}
            </span>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="hud-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--alien-border)] flex items-center gap-2">
            <span className="text-[var(--alien-plasma)] text-sm">◉</span>
            <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-dim)] text-[9px] tracking-[0.25em] uppercase">
              GLOBAL INTEL RANKINGS
            </span>
          </div>
          {leaderboard.slice(0, 10).map((entry, i) => (
            <div
              key={entry.alien_id}
              className={`px-4 py-2.5 flex items-center gap-3 border-b border-[var(--alien-border)] last:border-0 transition-colors ${entry.alien_id === myAlienId ? "bg-[#00f0ff06]" : ""}`}
            >
              <span
                style={{ fontFamily: "var(--font-mono)" }}
                className={`text-xs w-5 text-right tabular-nums shrink-0 ${i === 0 ? "text-[var(--alien-gold)] glow-gold" : i === 1 ? "text-[var(--alien-text-dim)]" : "text-[var(--alien-text-muted)]"}`}
              >
                {i === 0 ? "▲" : i + 1}
              </span>
              <span style={{ fontFamily: "var(--font-mono)" }} className="flex-1 text-xs text-[var(--alien-text-dim)] truncate">
                {sanitize(entry.alien_id)}
              </span>
              <span style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-plasma)] text-xs glow-plasma tabular-nums shrink-0">
                {entry.total_points.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
