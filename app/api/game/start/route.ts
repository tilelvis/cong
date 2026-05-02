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
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { level } = parsed.data;

    await db.execute(sql`
      INSERT INTO users (alien_id)
      VALUES (${sub})
      ON CONFLICT (alien_id) DO NOTHING
    `);

    const result = (await db.execute(sql`
      UPDATE game_wallets SET
        trials        = trials - 1,
        total_spent   = total_spent + 1,
        last_spent_at = NOW(),
        updated_at    = NOW()
      WHERE alien_id = ${sub} AND trials > 0
      RETURNING trials
    `)) as any;

    if (!result.rows || result.rows.length === 0) {
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
