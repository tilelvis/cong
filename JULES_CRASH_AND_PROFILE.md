# FIX 1 — Crash on last digit input
# File: `components/GameBoard.tsx`
# 1 surgical change only.

The crash happens in the auto-advance loop inside `handleNumberInput`.
When the player enters the last digit, `validateGrid` fires in a useEffect
and calls `onSolve`, which unmounts the game. Simultaneously, the auto-advance
loop tries to read `puzzle.grid[rr][cc]` — but `puzzle` is now stale from
the closed-over value and `grid[rr]` is undefined.

Fix: guard the auto-advance loop so it only runs when the puzzle is not yet
solved, and wrap the grid access in a bounds check.

Find this exact block inside `handleNumberInput`:
```ts
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
```

Replace with:
```ts
    if (!noteMode) {
      // Guard: only auto-advance if puzzle grid is still intact (not yet solved/unmounted)
      try {
        let found = false;
        outer: for (let rr = r; rr < n; rr++) {
          for (let cc = rr === r ? c + 1 : 0; cc < n; cc++) {
            const cell = puzzle.grid[rr]?.[cc];
            if (cell && !cell.isGiven && cell.playerValue === 0) {
              setSelected([rr, cc]); found = true; break outer;
            }
          }
        }
        if (!found) setSelected(null);
      } catch {
        setSelected(null);
      }
    }
```

---

# FIX 2 — Replace `app/profile/page.tsx` entirely
# Full profile with stats, badge tiers, achievements, and global leaderboard.

```tsx
"use client";

import { useAlien } from "@alien_org/react";
import { useQuery } from "@tanstack/react-query";
import { sanitize } from "@/lib/sanitize";

// ── Badge helpers ─────────────────────────────────────────────────────────────

function getOverallRank(pts: number): { emoji: string; name: string; next: number | null } {
  const ranks = [
    { emoji: "🌑", name: "Dark Matter",        min: 0      },
    { emoji: "🌒", name: "Nebula",             min: 1000   },
    { emoji: "🌓", name: "Stardust",           min: 5000   },
    { emoji: "🌔", name: "Nova",               min: 15000  },
    { emoji: "🌕", name: "Supernova",          min: 40000  },
    { emoji: "☄️", name: "Event Horizon",      min: 100000 },
    { emoji: "👽", name: "Alien Intelligence", min: 250000 },
  ];
  const current = [...ranks].reverse().find(r => pts >= r.min) ?? ranks[0];
  const nextRank = ranks.find(r => r.min > pts);
  return { ...current, next: nextRank?.min ?? null };
}

const BADGE_TIERS = [
  {
    label: "NOVICE",
    color: "#00ffb4",
    tiers: [
      { emoji: "🪐", name: "Cadet",     min: 0     },
      { emoji: "⭐", name: "Scout",     min: 500   },
      { emoji: "🌟", name: "Ranger",    min: 1500  },
      { emoji: "💫", name: "Commander", min: 3000  },
    ],
    key: "novice_points" as const,
  },
  {
    label: "SOLDIER",
    color: "#f5c542",
    tiers: [
      { emoji: "⚔️", name: "Recruit", min: 0    },
      { emoji: "🛡️", name: "Soldier", min: 1000 },
      { emoji: "🔱", name: "Warlord", min: 3000 },
      { emoji: "👑", name: "General", min: 7000 },
    ],
    key: "soldier_points" as const,
  },
  {
    label: "EXPERT",
    color: "#ff4d6d",
    tiers: [
      { emoji: "🔬", name: "Analyst",    min: 0     },
      { emoji: "🧠", name: "Cipher",     min: 2000  },
      { emoji: "⚡", name: "Phantom",    min: 6000  },
      { emoji: "👽", name: "Alien Mind", min: 15000 },
    ],
    key: "expert_points" as const,
  },
];

interface Wallet {
  total_points: number;
  novice_points: number;
  soldier_points: number;
  expert_points: number;
  games_won: number;
  games_played: number;
  current_streak: number;
  best_streak: number;
  trials: number;
}

interface LeaderboardEntry {
  alien_id: string;
  total_points: number;
  games_won: number;
  games_played: number;
  rank: number;
}

export default function ProfilePage() {
  const { authToken } = useAlien();

  const { data: wallet, isLoading: walletLoading } = useQuery<Wallet>({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/game-wallet", {
        headers: { Authorization: `Bearer ${authToken!}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authToken,
  });

  const { data: lbData, isLoading: lbLoading } = useQuery<{ leaderboard: LeaderboardEntry[]; me: LeaderboardEntry | null }>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard", {
        headers: { Authorization: `Bearer ${authToken!}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!authToken,
  });

  if (walletLoading) {
    return (
      <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--alien-text-muted)", letterSpacing: "0.2em" }}>
          LOADING INTEL...
        </div>
      </div>
    );
  }

  const pts = wallet?.total_points ?? 0;
  const rank = getOverallRank(pts);
  const winRate = (wallet?.games_played ?? 0) > 0
    ? Math.round(((wallet?.games_won ?? 0) / (wallet?.games_played ?? 1)) * 100)
    : 0;
  const progressPct = rank.next
    ? Math.min(100, (pts / rank.next) * 100)
    : 100;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: 64 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>

        {/* ── Overall rank card ── */}
        <div className="hud-card" style={{ padding: "20px 16px", textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 56, marginBottom: 8, lineHeight: 1 }}>{rank.emoji}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: "var(--alien-plasma)", letterSpacing: "0.15em" }}
            className="glow-plasma uppercase">
            {rank.name}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 900, color: "var(--alien-gold)", margin: "6px 0" }}
            className="glow-gold">
            {pts.toLocaleString()}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--alien-text-muted)", letterSpacing: "0.1em" }} className="uppercase">
            TOTAL INTEL POINTS
          </div>

          {/* Progress bar to next rank */}
          {rank.next && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--alien-text-muted)" }}>CURRENT</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--alien-text-muted)" }}>
                  {(rank.next - pts).toLocaleString()} pts to next rank
                </span>
              </div>
              <div style={{ background: "var(--alien-surface)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  background: "linear-gradient(90deg, var(--alien-plasma), var(--alien-energy))",
                  width: `${progressPct}%`,
                  boxShadow: "0 0 8px var(--alien-plasma)",
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--alien-border)" }}>
            {[
              { val: wallet?.games_won ?? 0,      label: "WINS"        },
              { val: wallet?.games_played ?? 0,   label: "PLAYED"      },
              { val: `${winRate}%`,                label: "WIN RATE"    },
              { val: wallet?.best_streak ?? 0,    label: "BEST STREAK" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--alien-text)" }}>{s.val}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--alien-text-muted)", letterSpacing: "0.06em", marginTop: 2 }} className="uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Badge tiers ── */}
        {BADGE_TIERS.map(tier => {
          const pts_for_tier = wallet?.[tier.key] ?? 0;
          const currentBadge = [...tier.tiers].reverse().find(t => pts_for_tier >= t.min) ?? tier.tiers[0];
          return (
            <div key={tier.label} className="hud-card" style={{ padding: "14px 14px", marginBottom: 10, borderColor: `${tier.color}30` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: tier.color, letterSpacing: "0.1em" }} className="uppercase">
                    {tier.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--alien-text-muted)", marginTop: 2 }}>
                    {pts_for_tier.toLocaleString()} pts
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24 }}>{currentBadge.emoji}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: tier.color, marginTop: 2 }}>{currentBadge.name}</div>
                </div>
              </div>
              {/* Badge progression */}
              <div style={{ display: "flex", gap: 6 }}>
                {tier.tiers.map(t => {
                  const earned = pts_for_tier >= t.min;
                  return (
                    <div key={t.name} style={{
                      flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 8,
                      background: earned ? `${tier.color}12` : "var(--alien-surface)",
                      border: `1px solid ${earned ? tier.color + "40" : "var(--alien-border)"}`,
                    }}>
                      <div style={{ fontSize: 18, filter: earned ? "none" : "grayscale(1) opacity(0.25)" }}>{t.emoji}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: earned ? tier.color : "var(--alien-text-muted)", marginTop: 3 }}>{t.name}</div>
                      {!earned && (
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "var(--alien-text-muted)", marginTop: 1 }}>
                          {t.min.toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Global leaderboard ── */}
        <div className="hud-card overflow-hidden" style={{ marginBottom: 8 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--alien-border)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--alien-plasma)" }}>🌌</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--alien-text-dim)", letterSpacing: "0.25em" }} className="uppercase">
              GALACTIC BOARD
            </span>
          </div>

          {lbLoading ? (
            <div style={{ padding: 16 }}>
              {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse border-b border-[var(--alien-border)]" />)}
            </div>
          ) : !lbData?.leaderboard?.length ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--alien-text-muted)", letterSpacing: "0.1em" }}>
                NO RANKINGS YET
              </span>
            </div>
          ) : (
            lbData.leaderboard.slice(0, 10).map((entry, i) => {
              const isMe = entry.alien_id === lbData.me?.alien_id;
              const podiumColor = i === 0 ? "#f5c542" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "var(--alien-text-muted)";
              return (
                <div key={entry.alien_id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderBottom: "1px solid var(--alien-border)",
                  background: isMe ? "#00f0ff06" : "transparent",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 900, color: podiumColor, width: 24, textAlign: "center", flexShrink: 0 }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: isMe ? "var(--alien-plasma)" : "var(--alien-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sanitize(entry.alien_id)}
                      {isMe && <span style={{ color: "var(--alien-plasma)", fontSize: 9, marginLeft: 6 }}>[YOU]</span>}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--alien-text-muted)", marginTop: 2 }}>
                      {entry.games_won}W / {entry.games_played}P
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--alien-gold)", flexShrink: 0 }}
                    className="glow-gold tabular-nums">
                    {entry.total_points.toLocaleString()}
                  </div>
                </div>
              );
            })
          )}

          {/* My rank if not in top 10 */}
          {lbData?.me && !lbData.leaderboard.slice(0,10).find(e => e.alien_id === lbData.me?.alien_id) && (
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--alien-border)", background: "#00f0ff06", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 900, color: "var(--alien-plasma)", width: 24, textAlign: "center" }}>
                #{lbData.me.rank}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--alien-plasma)" }}>YOU</div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--alien-gold)" }}>
                {lbData.me.total_points.toLocaleString()}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
```
