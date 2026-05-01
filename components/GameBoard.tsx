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
    isComplete: false,
    errors: [],
    cageStatuses: {},
  });
  const [noteMode, setNoteMode] = useState(false);
  const [history, setHistory] = useState<Puzzle[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const startTimeRef = useRef(Date.now());

  const config = LEVEL_CONFIGS[puzzle.level as keyof typeof LEVEL_CONFIGS];
  const n = puzzle.size;
  const hintsRemaining = (config?.hintAllowance ?? 0) - hintsUsed;

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
      onSolve({
        timeTakenMs: Date.now() - startTimeRef.current,
        hintsUsed,
        errorCount,
      });
    }
  }, [puzzle, solved, onSolve, hintsUsed, errorCount]);

  const handleNumberInput = useCallback((num: number) => {
    if (!selected || solved) return;
    const [r, c] = selected;
    if (puzzle.grid[r][c].isGiven) return;

    setHistory((prev) => [...prev.slice(-30), puzzle]);
    setPuzzle((prev) => {
      const newGrid = prev.grid.map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })));

      if (noteMode) {
        const notes = newGrid[r][c].notes;
        if (notes.includes(num)) {
          newGrid[r][c].notes = notes.filter(n => n !== num);
        } else {
          newGrid[r][c].notes = [...notes, num];
        }
      } else {
        const rowVals = newGrid[r].map((cc, ci) => (ci !== c ? cc.playerValue : 0)).filter((v) => v);
        const colVals = newGrid.map((rr, ri) => (ri !== r ? rr[c].playerValue : 0)).filter((v) => v);

        if (rowVals.includes(num) || colVals.includes(num)) {
          setErrorCount((e) => e + 1);
        }

        newGrid[r][c].playerValue = num;
        newGrid[r][c].notes = [];
      }
      return { ...prev, grid: newGrid };
    });

    if (!noteMode) {
      // Auto-advance
      let found = false;
      outer: for (let rr = r; rr < n; rr++) {
        for (let cc = rr === r ? c + 1 : 0; cc < n; cc++) {
          if (!puzzle.grid[rr][cc].isGiven && puzzle.grid[rr][cc].playerValue === 0) {
            setSelected([rr, cc]);
            found = true;
            break outer;
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
    setHistory((prev) => [...prev.slice(-30), puzzle]);
    setPuzzle((prev) => {
      const newGrid = prev.grid.map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })));
      newGrid[r][c].playerValue = 0;
      newGrid[r][c].notes = [];
      return { ...prev, grid: newGrid };
    });
  }, [selected, puzzle, solved]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setPuzzle(prev);
  }, [history]);

  const handleHint = useCallback(() => {
    if (hintsRemaining <= 0 || solved) return;
    const hint = getHint(puzzle);
    if (!hint) return;
    setHistory((prev) => [...prev.slice(-30), puzzle]);
    setHintsUsed((h) => h + 1);
    setPuzzle((prev) => {
      const newGrid = prev.grid.map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })));
      newGrid[hint.row][hint.col].playerValue = hint.value;
      newGrid[hint.row][hint.col].notes = [];
      return { ...prev, grid: newGrid };
    });
    setSelected([hint.row, hint.col]);
  }, [puzzle, hintsUsed, hintsRemaining, solved]);

  function getCageBorders(r: number, c: number) {
    const cell = puzzle.grid[r][c];
    const cageId = cell.cageId;
    const cage = puzzle.cages.find((cg) => cg.id === cageId);
    if (!cage) return {};

    const status = validation.cageStatuses[cageId];
    const baseColorIdx = cageId % CAGE_COLORS.length;
    const baseColor = CAGE_COLORS[baseColorIdx];

    const borderColor = status === "satisfied" ? "var(--alien-energy)"
      : status === "violated" ? "var(--alien-danger)"
      : baseColor;

    const inCage = (rr: number, cc: number) =>
      cage.cells.some((cl) => cl.row === rr && cl.col === cc);

    return {
      borderTopColor: !inCage(r - 1, c) ? borderColor : "transparent",
      borderBottomColor: !inCage(r + 1, c) ? borderColor : "transparent",
      borderLeftColor: !inCage(r, c - 1) ? borderColor : "transparent",
      borderRightColor: !inCage(r, c + 1) ? borderColor : "transparent",
      borderTopWidth: !inCage(r - 1, c) ? "2px" : "0",
      borderBottomWidth: !inCage(r + 1, c) ? "2px" : "0",
      borderLeftWidth: !inCage(r, c - 1) ? "2px" : "0",
      borderRightWidth: !inCage(r, c + 1) ? "2px" : "0",
    };
  }

  function isCageTopLeft(r: number, c: number): boolean {
    const cageId = puzzle.grid[r][c].cageId;
    const cage = puzzle.cages.find((cg) => cg.id === cageId);
    if (!cage) return false;
    const minRow = Math.min(...cage.cells.map((cl) => cl.row));
    const topCells = cage.cells.filter((cl) => cl.row === minRow);
    const minCol = Math.min(...topCells.map((cl) => cl.col));
    return r === minRow && c === minCol;
  }

  const errorPositions = new Set(validation.errors.map((e) => `${e.row},${e.col}`));
  const cellSize = Math.floor(320 / n);

  return (
    <div className="flex flex-col items-center px-3 py-4 gap-4">
      {/* Info HUD */}
      <div className="w-full flex items-center justify-between">
        <div className="hud-card px-3 py-1.5 flex items-center gap-2">
          <span style={{ color: "var(--alien-plasma)", fontSize: "11px" }}>⬡</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--alien-plasma)", fontSize: "13px" }} className="glow-plasma tabular-nums">
            {hintsRemaining}
          </span>
          <span style={{ fontFamily: "var(--font-body)", color: "var(--alien-text-muted)", fontSize: "9px", letterSpacing: "0.2em" }} className="uppercase">
            HINTS
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", color: "var(--alien-text-dim)", fontSize: "13px" }} className="tabular-nums">
          {formatTime(elapsed)}
        </div>
        <div className="hud-card px-3 py-1.5 flex items-center gap-2">
          <span style={{ color: "var(--alien-warning)", fontSize: "11px" }}>◉</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--alien-warning)", fontSize: "13px" }} className="tabular-nums">
            {errorCount}
          </span>
          <span style={{ fontFamily: "var(--font-body)", color: "var(--alien-text-muted)", fontSize: "9px", letterSpacing: "0.2em" }} className="uppercase">
            ERRORS
          </span>
        </div>
      </div>

      {/* Grid */}
      <div
        className="hud-card overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${n}, ${cellSize}px)`,
          gap: 0,
          boxShadow: "0 0 0 1px var(--alien-border-glow), 0 0 30px #00f0ff10, inset 0 0 30px #00f0ff06",
        }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((cell, c) => {
            const isGiven = cell.isGiven;
            const val = cell.playerValue;
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const isHighlighted = selected != null && (selected[0] === r || selected[1] === c) && !isSelected;
            const isError = errorPositions.has(`${r},${c}`);
            const cage = puzzle.cages.find((cg) => cg.id === cell.cageId);
            const showCageLabel = isCageTopLeft(r, c);
            const cageBorders = getCageBorders(r, c);

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => !isGiven && setSelected([r, c])}
                className="relative flex items-center justify-center overflow-hidden transition-all duration-100 select-none"
                style={{
                  width: cellSize,
                  height: cellSize,
                  border: "1px solid var(--alien-border)",
                  borderStyle: "solid",
                  ...cageBorders,
                  background: isSelected
                    ? "#00f0ff18"
                    : isHighlighted
                    ? "#00f0ff08"
                    : isGiven
                    ? "var(--alien-surface)"
                    : "var(--alien-dark)",
                  boxShadow: isSelected ? "inset 0 0 12px #00f0ff20" : "none",
                  outline: isSelected ? "1px solid var(--alien-plasma)" : "none",
                  outlineOffset: "-1px",
                }}
              >
                {isSelected && <span className="shimmer absolute inset-0 pointer-events-none" />}

                {showCageLabel && cage && (
                  <span
                    className="absolute top-0.5 left-0.5 leading-none pointer-events-none"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: Math.max(6, cellSize / 5.5) + "px",
                      color: CAGE_COLORS[cage.id % CAGE_COLORS.length],
                      opacity: 0.9,
                      textShadow: `0 0 4px ${CAGE_COLORS[cage.id % CAGE_COLORS.length]}`,
                    }}
                  >
                    ✦{cage.targetDigitSum}
                  </span>
                )}

                {/* Notes */}
                {!isGiven && val === 0 && cell.notes.length > 0 && (
                  <div className="grid grid-cols-3 gap-0.5 p-0.5 w-full h-full pointer-events-none">
                    {Array.from({ length: n }, (_, i) => i + 1).map(num => (
                      <div key={num} style={{
                        fontSize: cellSize / 5,
                        color: cell.notes.includes(num) ? "var(--alien-plasma)" : "transparent",
                        fontFamily: "var(--font-mono)",
                        textAlign: "center",
                        lineHeight: 1
                      }}>{num}</div>
                    ))}
                  </div>
                )}

                {(isGiven || val !== 0) && (
                  <span
                    className="relative z-10"
                    style={{
                      fontFamily: isGiven ? "var(--font-display)" : "var(--font-mono)",
                      fontSize: cellSize > 50 ? "18px" : cellSize > 36 ? "14px" : "11px",
                      fontWeight: isGiven ? "700" : "400",
                      color: isError
                        ? "var(--alien-danger)"
                        : isGiven
                        ? "var(--alien-plasma)"
                        : "var(--alien-text)",
                      textShadow: isGiven
                        ? "0 0 8px var(--alien-plasma-dim)"
                        : isError
                        ? "0 0 8px var(--alien-danger)"
                        : "none",
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

      {/* Number pad */}
      <div className="w-full" style={{ display: "grid", gridTemplateColumns: `repeat(${n <= 6 ? n : Math.ceil(n / 2)}, 1fr)`, gap: "6px" }}>
        {Array.from({ length: n }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            className="hud-card flex items-center justify-center transition-all duration-150 hover:border-[var(--alien-plasma)] hover:bg-[#00f0ff0a] active:scale-95"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              color: "var(--alien-text)",
              aspectRatio: "1",
              padding: "8px",
              minHeight: "44px",
              opacity: selected ? 1 : 0.35,
            }}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="w-full flex gap-2">
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="flex-1 hud-card py-2.5 text-[var(--alien-text-dim)] hover:text-[var(--alien-plasma)] hover:border-[var(--alien-plasma)] hover:bg-[#00f0ff08] transition-all duration-150 disabled:opacity-30 active:scale-95"
          style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.15em" }}
        >
          ◄ UNDO
        </button>
        <button
          onClick={() => setNoteMode(!noteMode)}
          className={`flex-1 hud-card py-2.5 transition-all duration-150 active:scale-95 ${
            noteMode ? "border-[var(--alien-plasma)] bg-[#00f0ff10] text-[var(--alien-plasma)]" : "text-[var(--alien-text-dim)] hover:text-[var(--alien-plasma)] hover:border-[var(--alien-plasma)] hover:bg-[#00f0ff08]"
          }`}
          style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.15em" }}
        >
          ✏ NOTES {noteMode ? "ON" : "OFF"}
        </button>
        <button
          onClick={handleErase}
          className="flex-1 hud-card py-2.5 text-[var(--alien-text-dim)] hover:text-[var(--alien-warning)] hover:border-[var(--alien-warning)] hover:bg-[#ff6b0010] transition-all duration-150 active:scale-95"
          style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.15em" }}
        >
          ✕ ERASE
        </button>
        <button
          onClick={handleHint}
          disabled={hintsRemaining <= 0}
          className="flex-1 hud-card py-2.5 text-[var(--alien-warning)] hover:border-[var(--alien-warning)] hover:bg-[#ff6b0010] transition-all duration-150 disabled:opacity-30 active:scale-95"
          style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.15em" }}
        >
          ◈ HINT ({hintsRemaining})
        </button>
      </div>
    </div>
  );
}
