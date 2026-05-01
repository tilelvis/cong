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
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: [...cell.notes] })));
      if (noteMode) {
        const notes = newGrid[r][c].notes;
        if (notes.includes(num)) notes.splice(notes.indexOf(num), 1); else notes.push(num);
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
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: [...cell.notes] })));
      newGrid[r][c].playerValue = 0;
      newGrid[r][c].notes = [];
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
      const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell, notes: [...cell.notes] })));
      newGrid[hint.row][hint.col].playerValue = hint.value;
      newGrid[hint.row][hint.col].notes = [];
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
              {!cell.isGiven && cell.playerValue === 0 && cell.notes.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                  gap: 1, padding: 2, width: '100%', height: '100%' }}>
                  {Array.from({ length: n }, (_, i) => i + 1).map(num => (
                    <div key={num} style={{ fontSize: 7,
                      color: cell.notes.includes(num) ? dc : 'transparent',
                      fontFamily: 'monospace', textAlign: 'center' }}>{num}</div>
                  ))}
                </div>
              )}
              {/* Cell value */}
              {(cell.isGiven || cell.playerValue !== 0) && cell.notes.length === 0 && (
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
