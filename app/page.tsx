'use client';

import { useAlien } from '@alien_org/react';
import { useEffect, useState, useCallback } from 'react';
import { GameWallet } from '@/components/GameWallet';
import { GameBoard } from '@/components/GameBoard';
import {
  getOverallRank, getNextRank,
  getNoviceBadge, getSoldierBadge, getExpertBadge,
  NOVICE_BADGES, SOLDIER_BADGES, EXPERT_BADGES,
} from '@/lib/badges';
import {
  LEVEL_CONFIGS, type DifficultyLevel, type Puzzle, type ScoreBreakdown,
} from '@/lib/puzzle-engine';
import { sanitize } from '@/lib/sanitize';

type Screen = 'home'|'levels'|'playing'|'result'|'wallet'|'leaderboard'|'profile';

interface WalletData {
  trials: number; total_points: number;
  novice_points: number; soldier_points: number; expert_points: number;
  games_won: number; games_played: number;
  current_streak: number; best_streak: number;
}
interface SessionData { sessionId: string; puzzle: Omit<Puzzle,'solution'>; trialsRemaining: number; }
interface LeaderboardEntry { alien_id: string; total_points: number; games_won: number; games_played: number; rank: number; }

const C = {
  bg:'#04060f', surface:'#080d1a', surface2:'#0d1526',
  green:'#00ffb4', gold:'#f5c542', red:'#ff4d6d',
  text:'#e2e8f0', muted:'#4a5568',
};

export default function Home() {
  const { authToken, isBridgeAvailable } = useAlien();
  const [screen, setScreen] = useState<Screen>('home');
  const [wallet, setWallet] = useState<WalletData|null>(null);
  const [session, setSession] = useState<SessionData|null>(null);
  const [score, setScore] = useState<ScoreBreakdown|null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [error, setError] = useState<string|null>(null);
  const [starting, setStarting] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!authToken) return;
    const res = await fetch('/api/game-wallet', { headers:{ Authorization:`Bearer ${authToken}` } });
    if (res.ok) setWallet(await res.json());
  }, [authToken]);

  const fetchLeaderboard = useCallback(async () => {
    if (!authToken) return;
    const res = await fetch('/api/leaderboard', { headers:{ Authorization:`Bearer ${authToken}` } });
    if (res.ok) { const d = await res.json(); setLeaderboard(d.leaderboard); setMyRank(d.me); }
  }, [authToken]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  async function startGame(level: DifficultyLevel) {
    if (!authToken || starting) return;
    setStarting(true); setError(null);
    const res = await fetch('/api/game/start', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${authToken}` },
      body: JSON.stringify({ level }),
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      setError(res.status===402 ? 'No trials left. Buy more to continue.' : err.error ?? 'Failed');
      setStarting(false); return;
    }
    const data = await res.json();
    setSession(data);
    setWallet(prev => prev ? { ...prev, trials: data.trialsRemaining } : null);
    setScreen('playing');
    setStarting(false);
  }

  async function handleSolve(timeTakenMs: number, hintsUsed: number, errorCount: number) {
    if (!authToken || !session) return;
    const res = await fetch('/api/game/submit', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${authToken}` },
      body: JSON.stringify({ sessionId: session.sessionId, timeTakenMs, hintsUsed, errorCount }),
    });
    if (res.ok) { setScore((await res.json()).score); setScreen('result'); fetchWallet(); }
  }

  async function handleQuit() {
    if (!authToken || !session) return;
    await fetch('/api/game/fail', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${authToken}` },
      body: JSON.stringify({ sessionId: session.sessionId }),
    });
    setSession(null); fetchWallet(); setScreen('home');
  }

  if (!isBridgeAvailable) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:72 }} className="float">🛸</div>
      <p style={{ color:C.muted, fontFamily:'monospace', fontSize:13 }}>Open inside the Alien app</p>
    </div>
  );

  if (!wallet) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:28, height:28, border:`2px solid ${C.green}`,
        borderTopColor:'transparent', borderRadius:'50%' }} className="spin" />
    </div>
  );

  const rank = getOverallRank(wallet.total_points);
  const nextRank = getNextRank(wallet.total_points);

  if (screen === 'wallet') return (
    <GameWallet trials={wallet.trials} onClose={() => setScreen('home')} onTrialsUpdated={fetchWallet} />
  );

  if (screen === 'playing' && session) {
    const config = LEVEL_CONFIGS[session.puzzle.level];
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
        flexDirection:'column', padding:'14px 14px 24px' }} className="fade-in">
        <GameBoard puzzle={session.puzzle as Puzzle} hintsAllowed={config.hintAllowance}
          onSolve={handleSolve} onQuit={handleQuit} />
      </div>
    );
  }

  if (screen === 'result' && score) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:24, gap:16 }} className="fade-in">
      <div style={{ fontSize:80 }} className="float">🏆</div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:'monospace', fontSize:24, fontWeight:900,
          color:C.green, letterSpacing:'0.1em' }} className="glow">PUZZLE SOLVED</div>
        {wallet.current_streak >= 3 && (
          <div style={{ color:C.gold, fontSize:13, fontFamily:'monospace', marginTop:4 }}>
            🔥 {wallet.current_streak} WIN STREAK!
          </div>
        )}
      </div>
      <div style={{ background:C.surface, border:`1px solid ${C.green}20`,
        borderRadius:18, padding:20, width:'100%' }}>
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace',
            letterSpacing:'0.1em', marginBottom:4 }}>FINAL SCORE</div>
          <div style={{ fontFamily:'monospace', fontSize:56, fontWeight:900,
            color:C.gold, lineHeight:1 }} className="glow">{score.final.toLocaleString()}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { label:'Base Score',    val:score.base,         color:C.text,  sign:'+' },
            { label:'Time Bonus',    val:score.timeBonus,    color:C.green, sign:'+' },
            { label:'Hint Penalty',  val:score.hintPenalty,  color:score.hintPenalty>0?C.red:C.muted,  sign:'-' },
            { label:'Error Penalty', val:score.errorPenalty, color:score.errorPenalty>0?C.red:C.muted, sign:'-' },
            { label:'Streak Bonus',  val:score.streakBonus,  color:score.streakBonus>0?C.gold:C.muted, sign:'+' },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', justifyContent:'space-between',
              fontFamily:'monospace', fontSize:12, padding:'4px 0',
              borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
              <span style={{ color:C.muted }}>{row.label}</span>
              <span style={{ color:row.val===0?C.muted:row.color, fontWeight:700 }}>
                {row.val===0?'—':`${row.sign}${row.val.toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:10, width:'100%' }}>
        <button onClick={() => { setScore(null); setError(null); setScreen('levels'); }}
          style={{ flex:1, padding:16, borderRadius:12, border:'none',
            background:`linear-gradient(135deg,${C.green},#00b4ff)`,
            color:C.bg, fontSize:14, fontWeight:900, fontFamily:'monospace', cursor:'pointer' }}>
          PLAY AGAIN
        </button>
        <button onClick={() => { setScore(null); setScreen('home'); }}
          style={{ flex:1, padding:16, borderRadius:12, border:`1px solid rgba(255,255,255,0.06)`,
            background:C.surface, color:C.text, fontSize:14, fontFamily:'monospace', cursor:'pointer' }}>
          HOME
        </button>
      </div>
    </div>
  );

  if (screen === 'levels') {
    const diffs = [
      { key:'cadet' as DifficultyLevel,     cfg: LEVEL_CONFIGS['cadet']      },
      { key:'scout' as DifficultyLevel,     cfg: LEVEL_CONFIGS['scout']      },
      { key:'ranger' as DifficultyLevel,    cfg: LEVEL_CONFIGS['ranger']     },
      { key:'warlord' as DifficultyLevel,   cfg: LEVEL_CONFIGS['warlord']    },
      { key:'phantom' as DifficultyLevel,   cfg: LEVEL_CONFIGS['phantom']    },
      { key:'alien-mind' as DifficultyLevel,cfg: LEVEL_CONFIGS['alien-mind'] },
    ];
    return (
      <div style={{ minHeight:'100vh', background:C.bg, padding:'24px 16px' }} className="fade-in">
        <button onClick={() => setScreen('home')} style={{ background:'none', border:'none',
          color:C.muted, fontFamily:'monospace', fontSize:13, cursor:'pointer', marginBottom:20 }}>
          ← BACK
        </button>
        <div style={{ fontFamily:'monospace', fontSize:18, fontWeight:900,
          color:C.green, letterSpacing:'0.1em', marginBottom:6 }}>SELECT MISSION</div>
        <div style={{ color:C.muted, fontSize:11, fontFamily:'monospace', marginBottom:20 }}>
          Faster solves = higher time multiplier = more points
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {diffs.map(({ key, cfg }) => (
            <button key={key} onClick={() => startGame(key)} disabled={starting}
              style={{ padding:'16px 18px', borderRadius:14, background:C.surface,
                border:`1px solid ${cfg.color}28`, cursor: starting ? 'not-allowed' : 'pointer',
                textAlign:'left', display:'flex', alignItems:'center', gap:14, opacity: starting ? 0.6 : 1 }}>
              <span style={{ fontSize:32 }}>{cfg.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ color:cfg.color, fontWeight:900, fontSize:15,
                  fontFamily:'monospace', letterSpacing:'0.06em' }}>{cfg.label}</div>
                <div style={{ color:C.muted, fontSize:11, fontFamily:'monospace', marginTop:2 }}>
                  {cfg.description}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ color:C.gold, fontSize:12, fontFamily:'monospace', fontWeight:700 }}>
                  {cfg.baseScore.toLocaleString()} base
                </div>
                <div style={{ color:C.muted, fontSize:10, fontFamily:'monospace', marginTop:2 }}>
                  {cfg.hintAllowance} hints
                </div>
              </div>
            </button>
          ))}
        </div>
        {error && (
          <div style={{ marginTop:16, padding:14, background:'rgba(255,77,109,0.08)',
            border:'1px solid rgba(255,77,109,0.25)', borderRadius:12,
            color:C.red, fontFamily:'monospace', fontSize:13, textAlign:'center' }}>
            {error}
            <button onClick={() => setScreen('wallet')} style={{ display:'block', width:'100%',
              marginTop:10, padding:'10px', borderRadius:8, background:`${C.green}08`,
              border:`1px solid ${C.green}30`, color:C.green, fontFamily:'monospace',
              fontSize:12, cursor:'pointer', fontWeight:700 }}>
              ⚡ GET TRIALS
            </button>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'leaderboard') {
    const podiumColor = (i:number) => ['#f5c542','#94a3b8','#b45309'][i] ?? 'transparent';
    return (
      <div style={{ minHeight:'100vh', background:C.bg, padding:'24px 16px' }} className="fade-in">
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => setScreen('home')} style={{ background:'none', border:'none',
            color:C.muted, fontFamily:'monospace', fontSize:13, cursor:'pointer' }}>← BACK</button>
          <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:900,
            color:C.green, letterSpacing:'0.1em' }}>🌌 GALACTIC BOARD</span>
        </div>
        {myRank && (
          <div style={{ background:C.surface, border:`1px solid ${C.green}25`,
            borderRadius:16, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace',
              letterSpacing:'0.1em', marginBottom:10 }}>YOUR RANKING</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:'monospace', fontSize:36, fontWeight:900, color:C.gold }}>
                  #{myRank.rank}
                </div>
                <div style={{ color:C.muted, fontSize:11, fontFamily:'monospace' }}>
                  {myRank.games_won}W / {myRank.games_played}P
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:36 }}>{getOverallRank(myRank.total_points).emoji}</div>
                <div style={{ color:C.green, fontSize:11, fontFamily:'monospace' }}>
                  {getOverallRank(myRank.total_points).name}
                </div>
                <div style={{ color:C.gold, fontSize:16, fontWeight:900, fontFamily:'monospace' }}>
                  {myRank.total_points.toLocaleString()} pts
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {leaderboard.map((entry, i) => {
            const r = getOverallRank(entry.total_points);
            const pc = podiumColor(i);
            return (
              <div key={entry.alien_id} style={{ display:'flex', alignItems:'center', gap:12,
                padding:'12px 14px', borderRadius:12, background:C.surface,
                border:`1px solid ${i<3?pc+'35':'rgba(255,255,255,0.04)'}`,
                boxShadow: i<3 ? `0 0 20px ${pc}12` : 'none' }}>
                <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:900,
                  color:i<3?pc:C.muted, width:28, textAlign:'center' }}>
                  {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${entry.rank}`}
                </div>
                <div style={{ fontSize:22 }}>{r.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'monospace', fontSize:12, color:C.text,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {sanitize(entry.alien_id)}
                  </div>
                  <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace' }}>
                    {r.name} · {entry.games_won}W / {entry.games_played}P
                  </div>
                </div>
                <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:700,
                  color:C.gold, flexShrink:0 }}>
                  {entry.total_points.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (screen === 'profile') {
    const nb = getNoviceBadge(wallet.novice_points);
    const sb = getSoldierBadge(wallet.soldier_points);
    const eb = getExpertBadge(wallet.expert_points);
    const winRate = wallet.games_played > 0
      ? Math.round((wallet.games_won / wallet.games_played) * 100) : 0;
    const progressPct = nextRank
      ? Math.min(100, ((wallet.total_points - rank.min) / (nextRank.min - rank.min)) * 100) : 100;
    const tiers = [
      { label:'NOVICE',  badge:nb, pts:wallet.novice_points,  all:NOVICE_BADGES,  color:C.green },
      { label:'SOLDIER', badge:sb, pts:wallet.soldier_points, all:SOLDIER_BADGES, color:C.gold  },
      { label:'EXPERT',  badge:eb, pts:wallet.expert_points,  all:EXPERT_BADGES,  color:C.red   },
    ];
    return (
      <div style={{ minHeight:'100vh', background:C.bg, padding:'24px 16px' }} className="fade-in">
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => setScreen('home')} style={{ background:'none', border:'none',
            color:C.muted, fontFamily:'monospace', fontSize:13, cursor:'pointer' }}>← BACK</button>
          <span style={{ fontFamily:'monospace', fontSize:15, fontWeight:900,
            color:C.green, letterSpacing:'0.1em' }}>👤 PROFILE</span>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.green}18`,
          borderRadius:20, padding:24, textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:64, marginBottom:8 }} className="float">{rank.emoji}</div>
          <div style={{ fontFamily:'monospace', fontSize:18, fontWeight:900,
            color:C.green, letterSpacing:'0.1em' }} className="glow">{rank.name}</div>
          <div style={{ fontFamily:'monospace', fontSize:42, fontWeight:900,
            color:C.gold, margin:'8px 0' }}>{wallet.total_points.toLocaleString()}</div>
          <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace',
            letterSpacing:'0.1em', marginBottom:16 }}>TOTAL POINTS</div>
          {nextRank && (
            <div style={{ background:`${C.green}06`, borderRadius:10, padding:12, marginBottom:16 }}>
              <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace', marginBottom:6 }}>
                NEXT: {nextRank.emoji} {nextRank.name}
              </div>
              <div style={{ background:C.surface2, borderRadius:6, height:6, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:6,
                  background:`linear-gradient(90deg,${C.green},#00b4ff)`,
                  width:`${progressPct}%`, transition:'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace', marginTop:6 }}>
                {(nextRank.min - wallet.total_points).toLocaleString()} pts to go
              </div>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-around',
            paddingTop:14, borderTop:`1px solid rgba(255,255,255,0.05)` }}>
            {[
              { v:wallet.games_won,   l:'WINS'        },
              { v:wallet.games_played,l:'PLAYED'      },
              { v:`${winRate}%`,      l:'WIN RATE'    },
              { v:wallet.best_streak, l:'BEST STREAK' },
            ].map(s => (
              <div key={s.l} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'monospace', fontSize:18, fontWeight:900, color:C.text }}>{s.v}</div>
                <div style={{ fontSize:9, color:C.muted, fontFamily:'monospace',
                  letterSpacing:'0.06em', marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        {tiers.map(t => (
          <div key={t.label} style={{ background:C.surface, border:`1px solid ${t.color}15`,
            borderRadius:16, padding:16, marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div>
                <div style={{ fontFamily:'monospace', fontSize:11, color:t.color,
                  fontWeight:700, letterSpacing:'0.08em' }}>{t.label}</div>
                <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace', marginTop:2 }}>
                  {t.pts.toLocaleString()} pts
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <span style={{ fontSize:26 }}>{t.badge.emoji}</span>
                <div style={{ fontSize:11, color:t.color, fontFamily:'monospace' }}>{t.badge.name}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {t.all.map(tier => {
                const earned = t.pts >= tier.min;
                return (
                  <div key={tier.id} style={{ flex:1, textAlign:'center', padding:'7px 4px',
                    borderRadius:8, background:earned ? `${t.color}10` : C.surface2,
                    border:`1px solid ${earned ? t.color+'30' : 'rgba(255,255,255,0.03)'}` }}>
                    <div style={{ fontSize:16, filter:earned?'none':'grayscale(1) opacity(0.2)' }}>
                      {tier.emoji}
                    </div>
                    <div style={{ fontSize:8, color:earned?t.color:C.muted,
                      fontFamily:'monospace', marginTop:2 }}>{tier.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // HOME
  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
      flexDirection:'column', padding:'28px 16px 24px' }} className="fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace',
            letterSpacing:'0.1em', marginBottom:4 }}>{rank.emoji} {rank.name}</div>
          <div style={{ fontFamily:'monospace', fontSize:28, fontWeight:900,
            color:C.green, letterSpacing:'0.15em', lineHeight:1 }} className="glow">
            CONGRUENCE
          </div>
          <div style={{ fontSize:10, color:C.muted, fontFamily:'monospace', marginTop:4 }}>
            Latin Square · Digit Sum Logic Puzzle
          </div>
        </div>
        <button onClick={() => setScreen('profile')}
          style={{ background:C.surface, border:`1px solid ${C.green}15`,
            borderRadius:12, padding:'8px 12px', cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <span style={{ fontSize:22 }}>{rank.emoji}</span>
          <span style={{ fontSize:9, color:C.green, fontFamily:'monospace' }}>PROFILE</span>
        </button>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[
          { val:wallet.total_points.toLocaleString(), lbl:'POINTS', color:C.gold      },
          { val:wallet.games_won,                     lbl:'WINS',   color:C.green     },
          { val:wallet.current_streak,                lbl:'STREAK', color:'#f97316'   },
          { val:wallet.trials,                        lbl:'TRIALS', color:'#3b82f6'   },
        ].map(s => (
          <div key={s.lbl} style={{ flex:1, background:C.surface,
            border:`1px solid rgba(255,255,255,0.04)`, borderRadius:12,
            padding:'12px 6px', textAlign:'center' }}>
            <div style={{ fontFamily:'monospace', fontSize:18, fontWeight:900, color:s.color }}>
              {s.val}
            </div>
            <div style={{ fontSize:8, color:C.muted, fontFamily:'monospace',
              letterSpacing:'0.06em', marginTop:3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'8px 0' }}>
        <div style={{ fontSize:80 }} className="float">🛸</div>
      </div>
      <button onClick={() => { setError(null); setScreen('levels'); }}
        style={{ width:'100%', padding:20, borderRadius:16, border:'none',
          background:`linear-gradient(135deg,${C.green},#00b4ff)`,
          color:C.bg, fontSize:18, fontWeight:900, fontFamily:'monospace',
          cursor:'pointer', letterSpacing:'0.1em', marginBottom:10,
          boxShadow:`0 0 40px ${C.green}18` }}>
        ▶ LAUNCH MISSION
      </button>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => setScreen('wallet')}
          style={{ flex:1, padding:14, borderRadius:12,
            border:`1px solid ${C.green}22`, background:`${C.green}06`,
            color:C.green, fontSize:12, fontFamily:'monospace', cursor:'pointer', fontWeight:700 }}>
          ⚡ GET TRIALS
        </button>
        <button onClick={() => { fetchLeaderboard(); setScreen('leaderboard'); }}
          style={{ flex:1, padding:14, borderRadius:12,
            border:`1px solid ${C.gold}22`, background:`${C.gold}06`,
            color:C.gold, fontSize:12, fontFamily:'monospace', cursor:'pointer', fontWeight:700 }}>
          🌌 LEADERBOARD
        </button>
      </div>
    </div>
  );
}
