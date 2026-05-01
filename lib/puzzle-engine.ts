export interface Cell {
  row: number; col: number; value: number;
  isGiven: boolean; playerValue: number;
  notes: number[]; cageId: number; isInvalid: boolean;
}

export interface Cage {
  id: number;
  cells: Array<{ row: number; col: number }>;
  targetDigitSum: number;
  color: string;
  status: 'pending' | 'satisfied' | 'violated';
}

export interface Puzzle {
  id: string; size: number;
  grid: Cell[][]; cages: Cage[];
  solution: number[][];
  level: DifficultyLevel;
}

export type DifficultyLevel =
  | 'cadet' | 'scout' | 'ranger' | 'warlord' | 'phantom' | 'alien-mind';

export interface LevelConfig {
  label: string; emoji: string; size: number;
  clueRatio: number; cageSizeMin: number; cageSizeMax: number;
  hintAllowance: number; baseScore: number;
  color: string; description: string;
}

export const LEVEL_CONFIGS: Record<DifficultyLevel, LevelConfig> = {
  'cadet':      { label:'Cadet',      emoji:'🪐', size:5, clueRatio:0.65, cageSizeMin:2, cageSizeMax:3, hintAllowance:5, baseScore:1000, color:'#00ffb4', description:'5×5 · 5 hints · Great for learning'   },
  'scout':      { label:'Scout',      emoji:'⭐', size:5, clueRatio:0.55, cageSizeMin:2, cageSizeMax:4, hintAllowance:4, baseScore:1000, color:'#4ade80', description:'5×5 · 4 hints · Fewer clues'            },
  'ranger':     { label:'Ranger',     emoji:'🌟', size:6, clueRatio:0.55, cageSizeMin:2, cageSizeMax:4, hintAllowance:3, baseScore:1200, color:'#60a5fa', description:'6×6 · 3 hints · Bigger grid'            },
  'warlord':    { label:'Warlord',    emoji:'⚔️', size:6, clueRatio:0.45, cageSizeMin:3, cageSizeMax:5, hintAllowance:2, baseScore:1200, color:'#f5c542', description:'6×6 · 2 hints · Hard cages'            },
  'phantom':    { label:'Phantom',    emoji:'⚡', size:8, clueRatio:0.42, cageSizeMin:3, cageSizeMax:5, hintAllowance:2, baseScore:1600, color:'#f97316', description:'8×8 · 2 hints · Expert territory'       },
  'alien-mind': { label:'Alien Mind', emoji:'👽', size:9, clueRatio:0.38, cageSizeMin:4, cageSizeMax:6, hintAllowance:1, baseScore:1800, color:'#ff4d6d', description:'9×9 · 1 hint · Maximum complexity'      },
};

const CAGE_COLORS = [
  '#dc2626','#2563eb','#16a34a','#ca8a04',
  '#9333ea','#db2777','#0891b2','#ea580c',
  '#059669','#7c3aed','#be185d','#0369a1',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function digitSum(n: number): number {
  if (n === 0) return 0;
  let s = n;
  while (s > 9) {
    s = String(s).split('').reduce((acc, d) => acc + parseInt(d), 0);
  }
  return s;
}

function generateLatinSquare(n: number): number[][] {
  const base = shuffle(Array.from({ length: n }, (_, i) => i + 1));
  const square: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => base[(j + i) % n])
  );
  const rowPerm = shuffle(Array.from({ length: n }, (_, i) => i));
  const colPerm = shuffle(Array.from({ length: n }, (_, i) => i));
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => square[rowPerm[i]][colPerm[j]])
  );
}

function generateCages(n: number, solution: number[][], minSize: number, maxSize: number): Cage[] {
  const assigned: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
  const cages: Cage[] = [];
  const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  let cageId = 0;

  const allCells = shuffle(
    Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => ({ r, c }))).flat()
  );

  for (const { r, c } of allCells) {
    if (assigned[r][c] !== -1) continue;
    const targetSize = randomInt(minSize, maxSize);
    const cells: Array<{ row: number; col: number }> = [];
    const queue = [{ row: r, col: c }];
    assigned[r][c] = cageId;

    while (queue.length > 0 && cells.length < targetSize) {
      const curr = queue.shift()!;
      cells.push(curr);
      for (const [dr, dc] of shuffle([...dirs])) {
        const nr = curr.row + dr; const nc = curr.col + dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && assigned[nr][nc] === -1) {
          assigned[nr][nc] = cageId;
          queue.push({ row: nr, col: nc });
        }
      }
    }

    const sum = cells.reduce((s, cell) => s + solution[cell.row][cell.col], 0);
    cages.push({ id: cageId, cells, targetDigitSum: digitSum(sum), color: CAGE_COLORS[cageId % CAGE_COLORS.length], status: 'pending' });
    cageId++;
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (assigned[r][c] === -1) {
        for (const [dr, dc] of [[0,1],[1,0],[0,-1],[-1,0]]) {
          const nr = r + dr; const nc = c + dc;
          if (nr >= 0 && nr < n && assigned[nr][nc] !== -1) {
            const cage = cages.find(cg => cg.id === assigned[nr][nc])!;
            cage.cells.push({ row: r, col: c });
            const sum = cage.cells.reduce((s, cell) => s + solution[cell.row][cell.col], 0);
            cage.targetDigitSum = digitSum(sum);
            assigned[r][c] = cage.id;
            break;
          }
        }
      }
    }
  }
  return cages;
}

function createClues(solution: number[][], cages: Cage[], clueRatio: number): Cell[][] {
  const n = solution.length;
  const cageOf: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
  for (const cage of cages) {
    for (const cell of cage.cells) cageOf[cell.row][cell.col] = cage.id;
  }

  const grid: Cell[][] = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => ({
      row: r, col: c, value: solution[r][c],
      isGiven: true, playerValue: solution[r][c],
      notes: [] as number[], cageId: cageOf[r][c], isInvalid: false,
    }))
  );

  const toRemove = Math.floor(n * n * (1 - clueRatio));
  const candidates = shuffle(
    Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => ({ r, c }))).flat()
  );

  let removed = 0;
  for (const { r, c } of candidates) {
    if (removed >= toRemove) break;
    grid[r][c].isGiven = false;
    grid[r][c].playerValue = 0;
    removed++;
  }
  return grid;
}

export function generatePuzzle(level: DifficultyLevel): Puzzle {
  const { size, clueRatio, cageSizeMin, cageSizeMax } = LEVEL_CONFIGS[level];
  const solution = generateLatinSquare(size);
  const cages = generateCages(size, solution, cageSizeMin, cageSizeMax);
  const grid = createClues(solution, cages, clueRatio);
  return {
    id: `${level}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    size, grid, cages, solution, level,
  };
}

export interface ValidationResult {
  isComplete: boolean;
  errors: Array<{ row: number; col: number }>;
  cageStatuses: Record<number, 'pending' | 'satisfied' | 'violated'>;
}

export function validateGrid(puzzle: Puzzle): ValidationResult {
  const { size, grid, cages, solution } = puzzle;
  const errorSet = new Set<string>();

  for (let i = 0; i < size; i++) {
    const rowMap = new Map<number, number[]>();
    const colMap = new Map<number, number[]>();
    for (let j = 0; j < size; j++) {
      const rv = grid[i][j].playerValue;
      const cv = grid[j][i].playerValue;
      if (rv !== 0) { if (!rowMap.has(rv)) rowMap.set(rv, []); rowMap.get(rv)!.push(j); }
      if (cv !== 0) { if (!colMap.has(cv)) colMap.set(cv, []); colMap.get(cv)!.push(j); }
    }
    for (const [, pos] of rowMap) if (pos.length > 1) for (const col of pos) errorSet.add(`${i},${col}`);
    for (const [, pos] of colMap) if (pos.length > 1) for (const row of pos) errorSet.add(`${row},${i}`);
  }

  const cageStatuses: Record<number, 'pending' | 'satisfied' | 'violated'> = {};
  for (const cage of cages) {
    const values = cage.cells.map(c => grid[c.row][c.col].playerValue);
    const filled = values.filter(v => v !== 0);
    if (filled.length < cage.cells.length) {
      cageStatuses[cage.id] = 'pending';
    } else {
      const sum = filled.reduce((s, v) => s + v, 0);
      cageStatuses[cage.id] = digitSum(sum) === cage.targetDigitSum ? 'satisfied' : 'violated';
    }
  }

  const allFilled = grid.every(row => row.every(c => c.playerValue !== 0));
  const noErrors = errorSet.size === 0;
  const noViolated = !Object.values(cageStatuses).includes('violated');
  let matchesSolution = true;
  if (allFilled && noErrors && noViolated) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c].playerValue !== solution[r][c]) { matchesSolution = false; break; }
      }
    }
  }

  return {
    isComplete: allFilled && noErrors && noViolated && matchesSolution,
    errors: Array.from(errorSet).map(k => { const [r, c] = k.split(',').map(Number); return { row: r, col: c }; }),
    cageStatuses,
  };
}

export function getHint(puzzle: Puzzle): { row: number; col: number; value: number } | null {
  const { grid, solution } = puzzle;
  const emptyCells: Array<{ row: number; col: number; value: number }> = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c].isGiven && grid[r][c].playerValue !== solution[r][c]) {
        emptyCells.push({ row: r, col: c, value: solution[r][c] });
      }
    }
  }
  if (emptyCells.length === 0) return null;

  const cageFillCount: Record<number, number> = {};
  for (const cell of emptyCells) {
    const cid = puzzle.grid[cell.row][cell.col].cageId;
    cageFillCount[cid] = (cageFillCount[cid] ?? 0) + 1;
  }
  emptyCells.sort((a, b) => {
    const cidA = puzzle.grid[a.row][a.col].cageId;
    const cidB = puzzle.grid[b.row][b.col].cageId;
    return (cageFillCount[cidA] ?? 0) - (cageFillCount[cidB] ?? 0);
  });
  return emptyCells[0];
}

export interface ScoreBreakdown {
  base: number; timeBonus: number; hintPenalty: number;
  errorPenalty: number; streakBonus: number; final: number;
}

export function calculateScore(
  level: DifficultyLevel,
  elapsedSeconds: number,
  hintsUsed: number,
  errorCount: number,
  currentStreak: number,
): ScoreBreakdown {
  const base = LEVEL_CONFIGS[level].baseScore;
  const timeBonus = Math.max(0, base - (elapsedSeconds * 2));
  const hintPenalty = hintsUsed * 150;
  const errorPenalty = errorCount * 25;
  const streakBonus = currentStreak >= 3 ? 200 : 0;
  const raw = base + timeBonus - hintPenalty - errorPenalty + streakBonus;
  return { base, timeBonus, hintPenalty, errorPenalty, streakBonus, final: Math.max(100, raw) };
}
