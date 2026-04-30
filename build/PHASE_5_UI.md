# PHASE 5 — UI
# CSS theme, layout, all components, and the main page.
# Prerequisite: Phase 4 complete — all API routes returning 200 in Vercel logs.
# This phase produces the entire visible game interface.

---

## STEP 1 — Replace `app/globals.css`

Full alien dark theme with CSS variables and animation keyframes.

```css
/* app/globals.css */
@import "tailwindcss";

/* ── Safe-area spacing (Alien SDK injects --alien-safe-area-inset-* vars) ── */
@theme inline {
  --spacing-safe-top:    var(--alien-safe-area-inset-top,    0px);
  --spacing-safe-bottom: var(--alien-safe-area-inset-bottom, 0px);
  --spacing-safe-left:   var(--alien-safe-area-inset-left,   0px);
  --spacing-safe-right:  var(--alien-safe-area-inset-right,  0px);
}

/* ── Alien dark theme palette ── */
:root {
  --bg:       #04060f;
  --surface:  #080d1a;
  --surface2: #0d1526;
  --border:   rgba(0,255,180,0.12);
  --green:    #00ffb4;
  --gold:     #f5c542;
  --red:      #ff4d6d;
  --blue:     #3b82f6;
  --text:     #e2e8f0;
  --muted:    #4a5568;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-geist-sans), sans-serif;
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
}

@keyframes spin   { to { transform: rotate(360deg); } }
@keyframes pulse  { 0%,100%{opacity:1}50%{opacity:.4} }
@keyframes glow   { 0%,100%{text-shadow:0 0 8px #00ffb4}50%{text-shadow:0 0 28px #00ffb4,0 0 56px #00ffb4} }
@keyframes float  { 0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)} }
@keyframes fadeIn { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }

.glow    { animation: glow    2s ease-in-out infinite; }
.float   { animation: float   3s ease-in-out infinite; }
.fade-in { animation: fadeIn  0.35s ease forwards; }
.spin    { animation: spin    0.8s linear infinite; }
.pulse   { animation: pulse   1.5s ease-in-out infinite; }
```

---

## STEP 2 — Replace `app/layout.tsx`

Removes the boilerplate tab bar and padded wrapper so the game has full screen control.

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Congruence",
  description: "Modular Arithmetic Puzzle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0, padding: 0, background: '#04060f', overflowX: 'hidden' }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

## STEP 3 — Create `components/GameBoard.tsx`

Tap-to-select grid with cage borders, digit sum labels, number pad,
undo, notes mode, hints, auto-advance and real-time validation.

```tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Puzzle, ValidationResult } from '@/lib/puzzle-engine';
import { validateGrid, getHint, LEVEL_CONFIGS } from '@/lib/puzzle-engine';

interface Props {
  puzzle: Puzzle;
  hintsAllowed: number;
  onSolve: (timeTakenMs: number, hintsUsed: number, errorCount: number) => void;
  onQuit: () => void;
}

export function GameBoard({ puzzle: initialPuzzle, hintsAllowed, onSolve, onQuit }: Props) {
  const [puzzle, setPuzzle] = useState<Puzzle>(initialPuzzle);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [validation, setValidation] = useState<ValidationResult>({
    isComplete: false, errors: [], cageStatuses: {}
  });
  const [noteMode, setNoteMode] = useState(false);
  const [history, setHistory] = useState<Puzzle[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const startTimeRef = useRef(Date.now());

  const config = LEVEL_CONFIGS[puzzle.level];
  const dc = config.color;
  const n = puzzle.size;
  const cellPx = n >= 8 ? 40 : n === 6 ? 52 : 62;
  const timerColor = elapsed < 60 ? '#00ffb4' : elapsed < 180 ? '#f5c542' : '#ff4d6d';
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');

  // Timer
  useEffect(() => {
    if (solved) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [solved]);

  // Validate on every grid change
  useEffect(() => {
    const result = validateGrid(puzzle);
    setValidation(result);
    if (result.isComplete && !solved) {
      setSolved(true);
      onSolve(Date.now() - startTimeRef.current, hintsUsed, errorCount);
    }
  }, [puzzle, solved, onSolve, hintsUsed, errorCount]);

  const enterValue = useCallback((num: number) => {
    if (!selected || solved) return;
    const [r, c] = selected;
    if (puzzle.grid[r][c].isGiven) return;

    setHistory(prev => [...prev.slice(-30), puzzle]);
    setPuzzle(prev => {
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: new Set(cell.notes) })));
      if (noteMode) {
        const notes = newGrid[r][c].notes;
        if (notes.has(num)) notes.delete(num); else notes.add(num);
      } else {
        const rowVals = newGrid[r].map((cc, ci) => ci !== c ? cc.playerValue : 0).filter(v => v);
        const colVals = newGrid.map((rr, ri) => ri !== r ? rr[c].playerValue : 0).filter(v => v);
        if (rowVals.includes(num) || colVals.includes(num)) setErrorCount(e => e + 1);
        newGrid[r][c].playerValue = num;
        newGrid[r][c].notes.clear();
      }
      return { ...prev, grid: newGrid };
    });

    if (!noteMode) {
      let found = false;
      outer: for (let rr = r; rr < n; rr++) {
        for (let cc = (rr === r ? c + 1 : 0); cc < n; cc++) {
          if (!puzzle.grid[rr][cc].isGiven && puzzle.grid[rr][cc].playerValue === 0) {
            setSelected([rr, cc]); found = true; break outer;
          }
        }
      }
      if (!found) setSelected(null);
    }
  }, [selected, puzzle, noteMode, solved, n]);

  const clearCell = useCallback(() => {
    if (!selected || solved) return;
    const [r, c] = selected;
    if (puzzle.grid[r][c].isGiven) return;
    setHistory(prev => [...prev.slice(-30), puzzle]);
    setPuzzle(prev => {
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: new Set(cell.notes) })));
      newGrid[r][c].playerValue = 0;
      newGrid[r][c].notes.clear();
      return { ...prev, grid: newGrid };
    });
  }, [selected, puzzle, solved]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setPuzzle(prev);
  }, [history]);

  const useHint = useCallback(() => {
    const hintsLeft = hintsAllowed - hintsUsed;
    if (hintsLeft <= 0 || solved) return;
    const hint = getHint(puzzle);
    if (!hint) return;
    setHistory(prev => [...prev.slice(-30), puzzle]);
    setHintsUsed(h => h + 1);
    setPuzzle(prev => {
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: new Set(cell.notes) })));
      newGrid[hint.row][hint.col].playerValue = hint.value;
      newGrid[hint.row][hint.col].notes.clear();
      return { ...prev, grid: newGrid };
    });
    setSelected([hint.row, hint.col]);
  }, [puzzle, hintsUsed, hintsAllowed, solved]);

  function getCageBorders(r: number, c: number): React.CSSProperties {
    const cageId = puzzle.grid[r][c].cageId;
    const cage = puzzle.cages.find(cg => cg.id === cageId);
    if (!cage) return {};
    const status = validation.cageStatuses[cageId];
    const borderColor = status === 'satisfied' ? '#00ffb4'
      : status === 'violated' ? '#ff4d6d'
      : cage.color + '80';
    const inCage = (rr: number, cc: number) =>
      cage.cells.some(cl => cl.row === rr && cl.col === cc);
    return {
      borderTopColor:    !inCage(r - 1, c) ? borderColor : 'transparent',
      borderBottomColor: !inCage(r + 1, c) ? borderColor : 'transparent',
      borderLeftColor:   !inCage(r, c - 1) ? borderColor : 'transparent',
      borderRightColor:  !inCage(r, c + 1) ? borderColor : 'transparent',
      borderWidth: '2px',
      borderStyle: 'solid',
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
  const hintsLeft = hintsAllowed - hintsUsed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, userSelect: 'none' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onQuit}
          style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.25)',
            borderRadius: 8, color: '#ff4d6d', fontSize: 11, padding: '6px 10px',
            fontFamily: 'monospace', cursor: 'pointer' }}>
          ✕ QUIT
        </button>
        <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900,
          color: timerColor, letterSpacing: '0.05em' }}>
          {mins}:{secs}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a5568', textAlign: 'right' }}>
          <div style={{ color: dc }}>{config.emoji} {config.label}</div>
          <div>{hintsLeft} hints left</div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, ${cellPx}px)`,
        gap: 2, justifyContent: 'center', marginBottom: 16 }}>
        {puzzle.grid.map((row, r) => row.map((cell, c) => {
          const isSelected = selected?.[0] === r && selected?.[1] === c;
          const isError = errorPositions.has(`${r},${c}`);
          const isHighlighted = selected !== null && (selected[0] === r || selected[1] === c);
          const cageBorders = getCageBorders(r, c);
          const showLabel = isCageTopLeft(r, c);
          const cage = puzzle.cages.find(cg => cg.id === cell.cageId);

          return (
            <div key={`${r}-${c}`}
              onClick={() => !cell.isGiven && setSelected(isSelected ? null : [r, c])}
              style={{
                width: cellPx, height: cellPx, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4, cursor: cell.isGiven ? 'default' : 'pointer',
                background: isSelected ? `${dc}28` : isError ? 'rgba(255,77,109,0.18)'
                  : isHighlighted ? 'rgba(255,255,255,0.04)' : cell.isGiven ? '#0d1526' : '#080d1a',
                boxShadow: isSelected ? `inset 0 0 0 2px ${dc}` : 'none',
                ...cageBorders, transition: 'background 0.1s',
              }}>
              {/* Cage digit sum label */}
              {showLabel && cage && (
                <div style={{ position: 'absolute', top: 2, left: 2, fontSize: 9,
                  fontFamily: 'monospace', fontWeight: 700, color: cage.color, lineHeight: 1,
                  background: 'rgba(4,6,15,0.85)', padding: '1px 3px', borderRadius: 3, zIndex: 2 }}>
                  ✦{cage.targetDigitSum}
                </div>
              )}
              {/* Notes */}
              {!cell.isGiven && cell.playerValue === 0 && cell.notes.size > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 1, padding: 2, width: '100%', height: '100%' }}>
                  {Array.from({ length: n }, (_, i) => i + 1).map(num => (
                    <div key={num} style={{ fontSize: 7,
                      color: cell.notes.has(num) ? dc : 'transparent',
                      fontFamily: 'monospace', textAlign: 'center' }}>{num}</div>
                  ))}
                </div>
              )}
              {/* Cell value */}
              {(cell.isGiven || cell.playerValue !== 0) && cell.notes.size === 0 && (
                <span style={{ fontSize: n >= 8 ? 14 : 18, fontWeight: 900,
                  fontFamily: 'monospace',
                  color: isError ? '#ff4d6d' : cell.isGiven ? dc : '#e2e8f0' }}>
                  {cell.isGiven ? cell.value : cell.playerValue}
                </span>
              )}
            </div>
          );
        }))}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        <button onClick={undo} disabled={history.length === 0}
          style={{ padding: '8px 14px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)', background: '#0d1526',
            color: history.length > 0 ? '#e2e8f0' : '#2d3748',
            fontFamily: 'monospace', fontSize: 12, cursor: history.length > 0 ? 'pointer' : 'not-allowed' }}>
          ↩ UNDO
        </button>
        <button onClick={() => setNoteMode(m => !m)}
          style={{ padding: '8px 14px', borderRadius: 8,
            border: `1px solid ${noteMode ? dc + '50' : 'rgba(255,255,255,0.08)'}`,
            background: noteMode ? `${dc}12` : '#0d1526',
            color: noteMode ? dc : '#4a5568', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer' }}>
          ✏ NOTES {noteMode ? 'ON' : 'OFF'}
        </button>
        <button onClick={useHint} disabled={hintsLeft === 0 || solved}
          style={{ padding: '8px 14px', borderRadius: 8,
            border: `1px solid ${hintsLeft > 0 ? '#f5c54250' : 'rgba(255,255,255,0.04)'}`,
            background: hintsLeft > 0 ? 'rgba(245,197,66,0.08)' : '#0d1526',
            color: hintsLeft > 0 ? '#f5c542' : '#2d3748',
            fontFamily: 'monospace', fontSize: 12,
            cursor: hintsLeft > 0 ? 'pointer' : 'not-allowed' }}>
          💡 HINT ({hintsLeft})
        </button>
      </div>

      {/* Number pad */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(n, 5)}, 1fr)`, gap: 6 }}>
        {Array.from({ length: n }, (_, i) => i + 1).map(num => (
          <button key={num} onClick={() => enterValue(num)}
            style={{ padding: '14px 4px', borderRadius: 10,
              border: `1px solid ${dc}20`, background: `${dc}08`,
              color: dc, fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
              cursor: 'pointer', opacity: selected ? 1 : 0.35 }}>
            {num}
          </button>
        ))}
        <button onClick={clearCell}
          style={{ padding: '14px 4px', borderRadius: 10,
            border: '1px solid rgba(255,77,109,0.2)', background: 'rgba(255,77,109,0.06)',
            color: '#ff4d6d', fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
            cursor: 'pointer', opacity: selected ? 1 : 0.35 }}>⌫
        </button>
      </div>
    </div>
  );
}
```

---

## STEP 4 — Create `components/GameWallet.tsx`

Bottom sheet with Buy tab and purchase History tab.
Polls every 2s for up to 30s after payment confirms to catch webhook latency.

```tsx
'use client';

import { useAlien, usePayment } from '@alien-id/miniapps-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { DEPOSIT_PACKS, type DepositPack } from '@/lib/deposit-packs';

interface PurchaseRecord {
  invoice: string;
  amount: string | null;
  token: string | null;
  status: string;
  created_at: string;
  product_id: string | null;
  trials_credited: number | null;
}

interface Props {
  trials: number;
  onClose: () => void;
  onTrialsUpdated: () => Promise<void>;
}

const TRIALS_LABEL: Record<string, string> = {
  'trials-10': '10 Trials',
  'trials-25': '27 Trials',
  'trials-50': '60 Trials',
  'trials-100': '130 Trials',
};

export function GameWallet({ trials, onClose, onTrialsUpdated }: Props) {
  const { authToken } = useAlien();
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [tab, setTab] = useState<'buy' | 'history'>('buy');
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Ref so polling closure always has the latest callback
  const onTrialsUpdatedRef = useRef(onTrialsUpdated);
  useEffect(() => { onTrialsUpdatedRef.current = onTrialsUpdated; }, [onTrialsUpdated]);

  const fetchHistory = useCallback(async () => {
    if (!authToken) return;
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/purchase-history', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab, fetchHistory]);

  const { pay } = usePayment({
    onPaid: () => {
      setStatus({ text: '✅ Payment confirmed! Crediting trials...', ok: true });
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await onTrialsUpdatedRef.current();
        if (attempts >= 15) {
          clearInterval(poll);
          setStatus({ text: '✅ Trials credited!', ok: true });
          fetchHistory();
        }
      }, 2000);
    },
    onCancelled: () => setStatus({ text: 'Payment cancelled.', ok: false }),
    onFailed: (code: string) => setStatus({ text: `Payment failed: ${code}`, ok: false }),
  });

  const handleBuy = useCallback(async (pack: DepositPack) => {
    if (!authToken || buying) return;
    setBuying(pack.id);
    setStatus(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ productId: pack.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus({ text: `Failed: ${err.error ?? res.status}`, ok: false });
        return;
      }
      const data = await res.json();
      await pay({
        recipient: data.recipient,
        amount: data.amount,
        token: data.token,
        network: data.network,
        invoice: data.invoice,
        item: data.item,
        ...(data.test ? { test: data.test } : {}),
      });
    } catch (err) {
      console.error('Payment error:', err);
      setStatus({ text: 'An error occurred. Please try again.', ok: false });
    } finally {
      setBuying(null);
    }
  }, [authToken, buying, pay]);

  return (
    <div style={S.overlay}>
      <div style={S.sheet}>
        <div style={S.header}>
          <span style={S.title}>⚡ GET TRIALS</span>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={S.balance}>
          <span style={S.balanceNum}>{trials}</span>
          <span style={S.balanceLabel}> trials remaining</span>
        </div>
        <div style={S.tabs}>
          {(['buy', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              ...S.tab,
              color: tab === t ? '#00ffb4' : '#444',
              borderBottom: tab === t ? '2px solid #00ffb4' : '2px solid transparent',
            }}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === 'buy' && (
          <>
            <p style={S.subtitle}>1 ALIEN = 1 trial. Larger packs include bonus trials.</p>
            <div style={S.grid}>
              {DEPOSIT_PACKS.map(pack => (
                <button key={pack.id} onClick={() => handleBuy(pack)} disabled={!!buying}
                  style={{ ...S.packBtn, opacity: buying && buying !== pack.id ? 0.4 : 1,
                    borderColor: pack.bonus ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.08)' }}>
                  {buying === pack.id ? (
                    <span style={{ color: '#888', fontSize: 12 }}>Processing...</span>
                  ) : (
                    <>
                      <div style={S.packTrials}>{pack.trials} Trials</div>
                      <div style={S.packPrice}>{Number(pack.amount) / 1e9} ALIEN</div>
                      {pack.bonus && <div style={S.packBonus}>{pack.bonus}</div>}
                    </>
                  )}
                </button>
              ))}
            </div>
            {status && (
              <div style={{ ...S.statusBox, color: status.ok ? '#00ffb4' : '#ef4444' }}>
                {status.text}
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#444', fontFamily: 'monospace', fontSize: 12 }}>Loading...</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#444', fontFamily: 'monospace', fontSize: 12 }}>No purchases yet</div>
            ) : history.map((item, i) => (
              <div key={i} style={S.histRow}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>
                    {item.product_id ? (TRIALS_LABEL[item.product_id] ?? item.product_id)
                      : item.amount ? `${Number(item.amount) / 1e9} ALIEN` : 'Purchase'}
                  </div>
                  {item.trials_credited && (
                    <div style={{ color: '#00ffb4', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
                      +{item.trials_credited} trials credited
                    </div>
                  )}
                  <div style={{ color: '#444', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                  color: item.status === 'paid' || item.status === 'completed' ? '#00ffb4' : '#ef4444' }}>
                  {item.status === 'paid' || item.status === 'completed' ? '✅ PAID' : item.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 100 },
  sheet:       { width: '100%', background: '#0a0a0f', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', maxHeight: '85vh', overflowY: 'auto' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:       { fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#00ffb4', letterSpacing: '0.1em' },
  closeBtn:    { background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer', padding: '0 4px' },
  balance:     { textAlign: 'center', marginBottom: 12 },
  balanceNum:  { fontSize: 44, fontWeight: 900, fontFamily: 'monospace', color: '#00ffb4' },
  balanceLabel:{ fontSize: 13, color: '#666', fontFamily: 'monospace' },
  tabs:        { display: 'flex', marginBottom: 16, borderBottom: '1px solid #1a1a1a' },
  tab:         { flex: 1, padding: '10px 0', background: 'none', border: 'none', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' },
  subtitle:    { textAlign: 'center', color: '#555', fontSize: 12, fontFamily: 'monospace', marginBottom: 16 },
  grid:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  packBtn:     { padding: '14px 10px', borderRadius: 12, background: '#111', border: '1px solid', cursor: 'pointer', textAlign: 'center', transition: 'opacity 0.15s' },
  packTrials:  { fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'monospace' },
  packPrice:   { fontSize: 12, color: '#f59e0b', fontFamily: 'monospace', marginTop: 4 },
  packBonus:   { fontSize: 10, color: '#00ffb4', fontFamily: 'monospace', marginTop: 3 },
  statusBox:   { fontSize: 12, fontFamily: 'monospace', textAlign: 'center', padding: 12, background: '#111', borderRadius: 8 },
  histRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #111' },
};
```

---

## STEP 5 — Replace `app/page.tsx`

Full game router: home → levels → playing → result → wallet → leaderboard → profile.

```tsx
'use client';

import { useAlien } from '@alien-id/miniapps-react';
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
```

---

## STEP 6 — Commit and Deploy

```bash
git add .
git commit -m "Phase 5: full UI — theme, GameBoard, GameWallet, page"
git push
```

---

## PHASE 5 COMPLETE CHECKLIST

- [ ] `app/globals.css` replaced — alien CSS variables and animations present
- [ ] `app/layout.tsx` replaced — no tab bar, no padded wrapper
- [ ] `components/GameBoard.tsx` created — cage borders, digit sum labels, number pad, undo, notes, hints
- [ ] `components/GameWallet.tsx` created — buy tab, history tab, polling on payment
- [ ] `app/page.tsx` replaced — all 7 screens working: home, levels, playing, result, wallet, leaderboard, profile
- [ ] Build passes on Vercel with no TypeScript errors
- [ ] App opens in Alien — home screen shows with floating 🛸, rank, 4 stat cards
