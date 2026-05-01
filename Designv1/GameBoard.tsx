"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CageInfo {
  id: string;
  target: number;
  operator: string;
  cells: [number, number][];
  color?: string;
}

interface PuzzleData {
  size: number;
  givens: (number | null)[][];
  cages: CageInfo[];
}

interface GameBoardProps {
  puzzle: unknown;
  level: string;
  onSolve: (params: { timeTakenMs: number; hintsUsed: number; errorCount: number }) => void;
  onFail: () => void;
}

// ── Alien cage colors ──────────────────────────────────────────────────────────

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

// ── Time formatter ─────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

// ── GameBoard ──────────────────────────────────────────────────────────────────

export function GameBoard({ puzzle: puzzleRaw, level, onSolve, onFail }: GameBoardProps) {
  const puzzle = puzzleRaw as PuzzleData;

  const size = puzzle?.size ?? 4;
  const nums = Array.from({ length: size }, (_, i) => i + 1);

  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    puzzle?.givens?.map((row) => [...row]) ?? Array.from({ length: size }, () => Array(size).fill(null))
  );

  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<(number | null)[][][]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [solved, setSolved] = useState(false);

  const maxHints = 3;
  const hintsRemaining = maxHints - hintsUsed;

  // Timer
  useEffect(() => {
    if (solved) return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime, solved]);

  // Cage map
  const cageMap = new Map<string, CageInfo & { colorIdx: number }>();
  puzzle?.cages?.forEach((cage, idx) => {
    cage.cells.forEach(([r, c]) => {
      cageMap.set(`${r},${c}`, { ...cage, colorIdx: idx % CAGE_COLORS.length });
    });
  });

  // Error detection
  const detectErrors = useCallback((g: (number | null)[][]) => {
    const errs = new Set<string>();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const v = g[r][c];
        if (!v) continue;
        // Row
        for (let cc = 0; cc < size; cc++) {
          if (cc !== c && g[r][cc] === v) { errs.add(`${r},${c}`); errs.add(`${r},${cc}`); }
        }
        // Col
        for (let rr = 0; rr < size; rr++) {
          if (rr !== r && g[rr][c] === v) { errs.add(`${r},${c}`); errs.add(`${rr},${c}`); }
        }
      }
    }
    return errs;
  }, [size]);

  // Check solved
  const checkSolved = useCallback((g: (number | null)[][], errs: Set<string>) => {
    if (errs.size > 0) return false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!g[r][c]) return false;
      }
    }
    return true;
  }, [size]);

  // Cell click
  const handleCellClick = (r: number, c: number) => {
    setSelected([r, c]);
  };

  // Number input
  const handleNumberInput = (n: number) => {
    if (!selected) return;
    const [r, c] = selected;
    if (puzzle?.givens?.[r]?.[c] != null) return;

    setHistory((h) => [...h, grid.map((row) => [...row])]);

    const newGrid = grid.map((row) => [...row]);
    const prev = newGrid[r][c];
    newGrid[r][c] = n;

    const newErrors = detectErrors(newGrid);
    setErrors(newErrors);

    if (newErrors.has(`${r},${c}`) && prev !== n) {
      setErrorCount((e) => e + 1);
    }

    setGrid(newGrid);

    if (checkSolved(newGrid, newErrors)) {
      setSolved(true);
      onSolve({ timeTakenMs: Date.now() - startTime, hintsUsed, errorCount: errorCount + (newErrors.size > 0 ? 1 : 0) });
    }

    // Auto-advance selection
    let nc = c + 1;
    let nr = r;
    if (nc >= size) { nc = 0; nr = r + 1; }
    if (nr < size) setSelected([nr, nc]);
  };

  // Erase
  const handleErase = () => {
    if (!selected) return;
    const [r, c] = selected;
    if (puzzle?.givens?.[r]?.[c] != null) return;
    setHistory((h) => [...h, grid.map((row) => [...row])]);
    const newGrid = grid.map((row) => [...row]);
    newGrid[r][c] = null;
    setGrid(newGrid);
    setErrors(detectErrors(newGrid));
  };

  // Undo
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGrid(prev);
    setErrors(detectErrors(prev));
  };

  // Hint
  const handleHint = () => {
    if (hintsRemaining <= 0) return;
    // Find a random empty cell and fill it from the solution (not available client-side, so just decrement counter here for tracking)
    setHintsUsed((h) => h + 1);
    // Actual hint logic depends on the solution being available; we just track the count here
  };

  // Cage border rendering
  const getCageBorderStyle = (r: number, c: number) => {
    const cage = cageMap.get(`${r},${c}`);
    if (!cage) return {};
    const color = CAGE_COLORS[cage.colorIdx];
    const isInCage = (rr: number, cc: number) => cageMap.get(`${rr},${cc}`)?.id === cage.id;
    return {
      borderTopColor: !isInCage(r - 1, c) ? color : "transparent",
      borderBottomColor: !isInCage(r + 1, c) ? color : "transparent",
      borderLeftColor: !isInCage(r, c - 1) ? color : "transparent",
      borderRightColor: !isInCage(r, c + 1) ? color : "transparent",
      borderTopWidth: !isInCage(r - 1, c) ? "2px" : "0",
      borderBottomWidth: !isInCage(r + 1, c) ? "2px" : "0",
      borderLeftWidth: !isInCage(r, c - 1) ? "2px" : "0",
      borderRightWidth: !isInCage(r, c + 1) ? "2px" : "0",
    };
  };

  const cellSize = Math.floor(320 / size);

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
          gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
          gap: 0,
          boxShadow: "0 0 0 1px var(--alien-border-glow), 0 0 30px #00f0ff10, inset 0 0 30px #00f0ff06",
        }}
      >
        {Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => {
            const isGiven = puzzle?.givens?.[r]?.[c] != null;
            const val = grid[r]?.[c];
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const isHighlighted = selected != null && (selected[0] === r || selected[1] === c) && !isSelected;
            const isError = errors.has(`${r},${c}`);
            const cage = cageMap.get(`${r},${c}`);
            const showCageLabel = cage?.cells[0][0] === r && cage?.cells[0][1] === c;
            const cageBorders = getCageBorderStyle(r, c);

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
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
                {/* Shimmer on selected */}
                {isSelected && <span className="shimmer absolute inset-0 pointer-events-none" />}

                {/* Cage label */}
                {showCageLabel && cage && (
                  <span
                    className="absolute top-0.5 left-0.5 leading-none pointer-events-none"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: Math.max(6, cellSize / 5.5) + "px",
                      color: CAGE_COLORS[cage.colorIdx],
                      opacity: 0.9,
                      textShadow: `0 0 4px ${CAGE_COLORS[cage.colorIdx]}`,
                    }}
                  >
                    {cage.target}{cage.operator}
                  </span>
                )}

                {/* Cell value */}
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
                  {val ?? ""}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Number pad */}
      <div className="w-full" style={{ display: "grid", gridTemplateColumns: `repeat(${size <= 6 ? size : Math.ceil(size / 2)}, 1fr)`, gap: "6px" }}>
        {nums.map((n) => (
          <button
            key={n}
            onClick={() => handleNumberInput(n)}
            className="hud-card flex items-center justify-center transition-all duration-150 hover:border-[var(--alien-plasma)] hover:bg-[#00f0ff0a] active:scale-95"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              color: "var(--alien-text)",
              aspectRatio: "1",
              padding: "8px",
              minHeight: "44px",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Action row */}
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
          ◈ HINT
        </button>
      </div>
    </div>
  );
}
