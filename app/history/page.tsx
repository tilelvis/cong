"use client";

import { useAlien } from "@alien_org/react";
import { useQuery } from "@tanstack/react-query";

interface GameHistoryEntry {
  id: string;
  level: string;
  status: string;
  score: number;
  points_earned: number;
  time_taken_ms: number;
  created_at: string;
}

async function fetchHistory(token: string): Promise<GameHistoryEntry[]> {
  const res = await fetch("/api/game/history", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function HistoryPage() {
  const { authToken } = useAlien();

  const { data: history, isLoading } = useQuery({
    queryKey: ["game-history"],
    queryFn: () => fetchHistory(authToken!),
    enabled: !!authToken,
  });

  return (
    <div className="px-4 py-8 pb-28 space-y-6 min-h-screen bg-[var(--alien-void)]">
      <div className="text-center">
        <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-plasma)] text-xl font-black uppercase tracking-[0.2em] glow-plasma">
          ◌ MISSION INTEL
        </div>
        <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[10px] tracking-[0.25em] mt-1 uppercase">
          PROTOCOL LOGS
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="hud-card h-20 animate-pulse" />
          ))
        ) : !history?.length ? (
          <div className="hud-card p-12 text-center">
            <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-sm uppercase tracking-widest">
              NO MISSIONS RECORDED
            </div>
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="hud-card p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-text)] text-xs uppercase tracking-widest">
                  {entry.level} PROTOCOL
                </div>
                <div style={{ fontFamily: "var(--font-mono)" }} className="text-[var(--alien-text-muted)] text-[10px]">
                  {new Date(entry.created_at).toLocaleDateString()} · {formatTime(entry.time_taken_ms)}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div
                  style={{ fontFamily: "var(--font-mono)" }}
                  className={`text-xs font-bold uppercase ${entry.status === 'won' ? 'text-[var(--alien-energy)]' : 'text-[var(--alien-danger)]'}`}
                >
                  {entry.status === 'won' ? 'SUCCESS' : 'FAILED'}
                </div>
                <div style={{ fontFamily: "var(--font-display)" }} className="text-[var(--alien-plasma)] text-sm glow-plasma">
                  +{entry.points_earned}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
