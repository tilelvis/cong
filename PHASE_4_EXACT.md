# PHASE 4 — GAME ENGINE
# Prerequisite: Phase 3 complete — a real payment must have credited trials in Neon.
# Creates 10 new files. Does not modify any existing file except as noted.

---

## CRITICAL — AUTH PATTERN FOR ALL ROUTES IN THIS PHASE

Every API route uses `verifyToken` + `extractBearerToken` from `features/auth/lib`.
Copy this block exactly at the top of every route handler:

```ts
import { verifyToken, extractBearerToken } from '@/features/auth/lib';
import { JwtErrors } from '@alien_org/auth-client';

// Inside the handler:
const token = extractBearerToken(request.headers.get('Authorization'));
if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
const { sub } = await verifyToken(token);
// sub === alienId
```

Wrap the whole handler in try/catch and handle JwtErrors at the bottom:
```ts
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
```

---

## STEP 1 — Create `lib/sanitize.ts`

```ts
export function sanitize(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
```

---

## STEP 2 — Create `lib/schemas.ts`

```ts
import { z } from 'zod';

const VALID_LEVELS = [
  'cadet', 'scout', 'ranger', 'warlord', 'phantom', 'alien-mind',
] as const;

export const StartGameSchema = z.object({
  level: z.enum(VALID_LEVELS, {
    message: 'level must be one of: cadet, scout, ranger, warlord, phantom, alien-mind',
  }),
});

export const SubmitGameSchema = z.object({
  sessionId:   z.string().uuid({ message: 'sessionId must be a valid UUID' }),
  timeTakenMs: z.number().int().min(0).max(86_400_000),
  hintsUsed:   z.number().int().min(0).max(10),
  errorCount:  z.number().int().min(0).max(1000),
});

export const FailGameSchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId must be a valid UUID' }),
});
```

---

## STEP 3 — Create `lib/badges.ts`

```ts
export const DIFFICULTY_BASE_POINTS = {
  novice: 100,
  soldier: 300,
  expert: 700,
} as const;

export function getTimeMultiplier(timeTakenMs: number): number {
  const s = timeTakenMs / 1000;
  if (s < 30)  return 3.0;
  if (s < 60)  return 2.0;
  if (s < 120) return 1.5;
  if (s < 300) return 1.0;
  return 0.5;
}

export function calcPoints(
  difficulty: 'novice' | 'soldier' | 'expert',
  timeTakenMs: number,
): { points: number; multiplier: number } {
  const base = DIFFICULTY_BASE_POINTS[difficulty];
  const multiplier = getTimeMultiplier(timeTakenMs);
  return { points: Math.round(base * multiplier), multiplier };
}

export const NOVICE_BADGES = [
  { id: 'novice-0', emoji: '🪐', name: 'Cadet',     min: 0     },
  { id: 'novice-1', emoji: '⭐', name: 'Scout',     min: 500   },
  { id: 'novice-2', emoji: '🌟', name: 'Ranger',    min: 1500  },
  { id: 'novice-3', emoji: '💫', name: 'Commander', min: 3000  },
] as const;

export const SOLDIER_BADGES = [
  { id: 'soldier-0', emoji: '⚔️',  name: 'Recruit', min: 0    },
  { id: 'soldier-1', emoji: '🛡️',  name: 'Soldier', min: 1000 },
  { id: 'soldier-2', emoji: '🔱',  name: 'Warlord', min: 3000 },
  { id: 'soldier-3', emoji: '👑',  name: 'General', min: 7000 },
] as const;

export const EXPERT_BADGES = [
  { id: 'expert-0', emoji: '🔬', name: 'Analyst',    min: 0     },
  { id: 'expert-1', emoji: '🧠', name: 'Cipher',     min: 2000  },
  { id: 'expert-2', emoji: '⚡', name: 'Phantom',    min: 6000  },
  { id: 'expert-3', emoji: '👽', name: 'Alien Mind', min: 15000 },
] as const;

export const OVERALL_RANKS = [
  { emoji: '🌑', name: 'Dark Matter',        min: 0      },
  { emoji: '🌒', name: 'Nebula',             min: 1000   },
  { emoji: '🌓', name: 'Stardust',           min: 5000   },
  { emoji: '🌔', name: 'Nova',               min: 15000  },
  { emoji: '🌕', name: 'Supernova',          min: 40000  },
  { emoji: '☄️', name: 'Event Horizon',      min: 100000 },
  { emoji: '👽', name: 'Alien Intelligence', min: 250000 },
] as const;

type BadgeEntry = { emoji: string; name: string; min: number };

function getBadge(pts: number, tiers: readonly BadgeEntry[]): BadgeEntry {
  return [...tiers].reverse().find(t => pts >= t.min) ?? tiers[0];
}

export function getNoviceBadge(pts: number)  { return getBadge(pts, NOVICE_BADGES);  }
export function getSoldierBadge(pts: number) { return getBadge(pts, SOLDIER_BADGES); }
export function getExpertBadge(pts: number)  { return getBadge(pts, EXPERT_BADGES);  }
export function getOverallRank(pts: number)  { return getBadge(pts, OVERALL_RANKS);  }

export function getNextRank(pts: number): BadgeEntry | null {
  return [...OVERALL_RANKS].find(r => r.min > pts) ?? null;
}
```

---

## STEP 4 — Create `lib/puzzle-engine.ts`

```ts
export interface Cell {
  row: number; col: number; value: number;
  isGiven: boolean; playerValue: number;
  notes: Set<number>; cageId: number; isInvalid: boolean;
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
  'cadet':      { label:'Cadet',      emoji:'🪐', size:5, clueRatio:0.55, cageSizeMin:2, cageSizeMax:3, hintAllowance:5, baseScore:1000, color:'#00ffb4', description:'5×5 · 5 hints · Great for learning'   },
  'scout':      { label:'Scout',      emoji:'⭐', size:5, clueRatio:0.45, cageSizeMin:2, cageSizeMax:4, hintAllowance:4, baseScore:1000, color:'#4ade80', description:'5×5 · 4 hints · Fewer clues'            },
  'ranger':     { label:'Ranger',     emoji:'🌟', size:6, clueRatio:0.45, cageSizeMin:2, cageSizeMax:4, hintAllowance:3, baseScore:1200, color:'#60a5fa', description:'6×6 · 3 hints · Bigger grid'            },
  'warlord':    { label:'Warlord',    emoji:'⚔️', size:6, clueRatio:0.35, cageSizeMin:3, cageSizeMax:5, hintAllowance:2, baseScore:1200, color:'#f5c542', description:'6×6 · 2 hints · Hard cages'            },
  'phantom':    { label:'Phantom',    emoji:'⚡', size:8, clueRatio:0.32, cageSizeMin:3, cageSizeMax:5, hintAllowance:2, baseScore:1600, color:'#f97316', description:'8×8 · 2 hints · Expert territory'       },
  'alien-mind': { label:'Alien Mind', emoji:'👽', size:9, clueRatio:0.28, cageSizeMin:4, cageSizeMax:6, hintAllowance:1, baseScore:1800, color:'#ff4d6d', description:'9×9 · 1 hint · Maximum complexity'      },
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
      notes: new Set<number>(), cageId: cageOf[r][c], isInvalid: false,
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
```

---

## STEP 5 — Create `app/api/game-wallet/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyToken, extractBearerToken } from '@/features/auth/lib';
import { JwtErrors } from '@alien_org/auth-client';

const REFILL_AMOUNT = 5;
const REFILL_INTERVAL_MS = 10 * 60 * 1000;
const REFILL_CAP = 5;

export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    const { sub } = await verifyToken(token);

    await db.execute(sql`
      INSERT INTO game_wallets (alien_id, trials)
      VALUES (${sub}, 5)
      ON CONFLICT (alien_id) DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT trials, total_purchased, total_spent, last_spent_at,
             total_points, novice_points, soldier_points, expert_points,
             games_won, games_played, current_streak, best_streak
      FROM game_wallets WHERE alien_id = ${sub}
    `);

    const wallet = result.rows[0] as any;

    let trialsToAdd = 0;
    if (wallet.last_spent_at) {
      const msSince = Date.now() - new Date(wallet.last_spent_at).getTime();
      const windows = Math.floor(msSince / REFILL_INTERVAL_MS);
      trialsToAdd = Math.min(windows * REFILL_AMOUNT, REFILL_CAP);
    }

    if (trialsToAdd > 0) {
      await db.execute(sql`
        UPDATE game_wallets SET
          trials = trials + ${trialsToAdd},
          last_spent_at = NOW()
        WHERE alien_id = ${sub}
      `);
      wallet.trials = Number(wallet.trials) + trialsToAdd;
    }

    return NextResponse.json({
      trials:          Number(wallet.trials),
      total_purchased: Number(wallet.total_purchased ?? 0),
      total_spent:     Number(wallet.total_spent ?? 0),
      total_points:    Number(wallet.total_points ?? 0),
      novice_points:   Number(wallet.novice_points ?? 0),
      soldier_points:  Number(wallet.soldier_points ?? 0),
      expert_points:   Number(wallet.expert_points ?? 0),
      games_won:       Number(wallet.games_won ?? 0),
      games_played:    Number(wallet.games_played ?? 0),
      current_streak:  Number(wallet.current_streak ?? 0),
      best_streak:     Number(wallet.best_streak ?? 0),
    });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    if (error instanceof JwtErrors.JOSEError) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    console.error('Error in /api/game-wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## STEP 6 — Create `app/api/game/start/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyToken, extractBearerToken } from '@/features/auth/lib';
import { JwtErrors } from '@alien_org/auth-client';
import { generatePuzzle } from '@/lib/puzzle-engine';
import { StartGameSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    const { sub } = await verifyToken(token);

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const parsed = StartGameSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { level } = parsed.data;

    const result = await db.execute(sql`
      UPDATE game_wallets SET
        trials        = trials - 1,
        total_spent   = total_spent + 1,
        last_spent_at = NOW(),
        updated_at    = NOW()
      WHERE alien_id = ${sub} AND trials > 0
      RETURNING trials
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No trials remaining' }, { status: 402 });
    }

    const puzzle = generatePuzzle(level);
    const sessionId = randomUUID();

    await db.execute(sql`
      INSERT INTO game_sessions
        (id, alien_id, difficulty, level, grid_size, puzzle, solution)
      VALUES (
        ${sessionId}, ${sub}, ${level}, ${level}, ${puzzle.size},
        ${JSON.stringify(puzzle)}::jsonb,
        ${JSON.stringify(puzzle.solution)}::jsonb
      )
    `);

    const { solution: _omit, ...puzzleForClient } = puzzle;

    return NextResponse.json({
      sessionId,
      puzzle: puzzleForClient,
      trialsRemaining: Number(result.rows[0].trials),
    });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    if (error instanceof JwtErrors.JOSEError) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    console.error('Error in /api/game/start:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## STEP 7 — Create `app/api/game/submit/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyToken, extractBearerToken } from '@/features/auth/lib';
import { JwtErrors } from '@alien_org/auth-client';
import { calculateScore, type DifficultyLevel } from '@/lib/puzzle-engine';
import { SubmitGameSchema } from '@/lib/schemas';

interface GameSessionRow {
  id: string; alien_id: string; level: string; status: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    const { sub } = await verifyToken(token);

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const parsed = SubmitGameSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { sessionId, timeTakenMs, hintsUsed, errorCount } = parsed.data;

    const sessionResult = await db.execute(sql`
      SELECT id, alien_id, level, status FROM game_sessions
      WHERE id = ${sessionId} AND alien_id = ${sub} AND status = 'active'
    `);

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionResult.rows[0] as GameSessionRow;

    const walletResult = await db.execute(sql`
      SELECT current_streak FROM game_wallets WHERE alien_id = ${sub}
    `);
    const currentStreak = Number((walletResult.rows[0] as any)?.current_streak ?? 0);

    const elapsedSeconds = Math.floor(timeTakenMs / 1000);
    const score = calculateScore(session.level as DifficultyLevel, elapsedSeconds, hintsUsed, errorCount, currentStreak);
    const newStreak = currentStreak + 1;

    const diffCol = ['cadet', 'scout'].includes(session.level) ? 'novice_points'
      : ['ranger', 'warlord'].includes(session.level) ? 'soldier_points'
      : 'expert_points';

    await db.execute(sql`
      UPDATE game_sessions SET
        status = 'won', score = ${score.final}, points_earned = ${score.final},
        time_taken_ms = ${timeTakenMs}, hints_used = ${hintsUsed}, errors = ${errorCount},
        base_score = ${score.base}, time_bonus = ${score.timeBonus},
        hint_penalty = ${score.hintPenalty}, error_penalty = ${score.errorPenalty},
        streak_bonus = ${score.streakBonus}, completed_at = NOW()
      WHERE id = ${sessionId} AND alien_id = ${sub}
    `);

    await db.execute(sql`
      UPDATE game_wallets SET
        total_points     = total_points + ${score.final},
        novice_points    = novice_points  + ${diffCol === 'novice_points'  ? score.final : 0},
        soldier_points   = soldier_points + ${diffCol === 'soldier_points' ? score.final : 0},
        expert_points    = expert_points  + ${diffCol === 'expert_points'  ? score.final : 0},
        games_won        = games_won + 1,
        games_played     = games_played + 1,
        current_streak   = ${newStreak},
        best_streak      = GREATEST(best_streak, ${newStreak}),
        hints_used_total = hints_used_total + ${hintsUsed},
        updated_at       = NOW()
      WHERE alien_id = ${sub}
    `);

    return NextResponse.json({ score });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    if (error instanceof JwtErrors.JOSEError) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    console.error('Error in /api/game/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## STEP 8 — Create `app/api/game/fail/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyToken, extractBearerToken } from '@/features/auth/lib';
import { JwtErrors } from '@alien_org/auth-client';
import { FailGameSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    const { sub } = await verifyToken(token);

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const parsed = FailGameSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { sessionId } = parsed.data;

    await db.execute(sql`
      UPDATE game_sessions SET status = 'lost', completed_at = NOW()
      WHERE id = ${sessionId} AND alien_id = ${sub} AND status = 'active'
    `);

    await db.execute(sql`
      UPDATE game_wallets SET
        games_played = games_played + 1, current_streak = 0, updated_at = NOW()
      WHERE alien_id = ${sub}
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    if (error instanceof JwtErrors.JOSEError) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    console.error('Error in /api/game/fail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## STEP 9 — Create `app/api/game/history/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyToken, extractBearerToken } from '@/features/auth/lib';
import { JwtErrors } from '@alien_org/auth-client';

export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    const { sub } = await verifyToken(token);

    const result = await db.execute(sql`
      SELECT id, difficulty, level, grid_size, status, score,
             points_earned, time_taken_ms, hints_used, errors,
             base_score, time_bonus, hint_penalty, error_penalty,
             streak_bonus, created_at, completed_at
      FROM game_sessions
      WHERE alien_id = ${sub}
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    if (error instanceof JwtErrors.JOSEError) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    console.error('Error in /api/game/history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## STEP 10 — Create `app/api/leaderboard/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { verifyToken, extractBearerToken } from '@/features/auth/lib';
import { JwtErrors } from '@alien_org/auth-client';

export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    const { sub } = await verifyToken(token);

    const top = await db.execute(sql`
      SELECT alien_id, total_points, novice_points, soldier_points,
             expert_points, games_won, games_played,
             RANK() OVER (ORDER BY total_points DESC) as rank
      FROM game_wallets
      WHERE games_played > 0
      ORDER BY total_points DESC
      LIMIT 50
    `);

    const me = await db.execute(sql`
      SELECT total_points, novice_points, soldier_points, expert_points,
             games_won, games_played,
             RANK() OVER (ORDER BY total_points DESC) as rank
      FROM game_wallets WHERE alien_id = ${sub}
    `);

    return NextResponse.json({ leaderboard: top.rows, me: me.rows[0] ?? null });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    if (error instanceof JwtErrors.JOSEError) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    console.error('Error in /api/leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## STEP 11 — Commit and deploy

```bash
git add .
git commit -m "Phase 4: game engine, lib files, all game API routes"
git push
```

Wait for green Vercel build. Then verify in Vercel function logs that calling
`/api/game-wallet` returns 200 with a `trials` field when called from
inside the Alien app.

---

## PHASE 4 CHECKLIST

- [ ] `lib/sanitize.ts` created
- [ ] `lib/schemas.ts` created
- [ ] `lib/badges.ts` created
- [ ] `lib/puzzle-engine.ts` created
- [ ] `app/api/game-wallet/route.ts` created
- [ ] `app/api/game/start/route.ts` created — calls `verifyToken`, deducts trial, inserts game_session
- [ ] `app/api/game/submit/route.ts` created — IDOR check `AND alien_id = ${sub}`
- [ ] `app/api/game/fail/route.ts` created
- [ ] `app/api/game/history/route.ts` created
- [ ] `app/api/leaderboard/route.ts` created
- [ ] No file references `verifyRequest` or `features/auth/server-lib` — they do not exist
- [ ] Vercel build green
