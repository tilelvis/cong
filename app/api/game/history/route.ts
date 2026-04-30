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

    const result = (await db.execute(sql`
      SELECT id, difficulty, level, grid_size, status, score,
             points_earned, time_taken_ms, hints_used, errors,
             base_score, time_bonus, hint_penalty, error_penalty,
             streak_bonus, created_at, completed_at
      FROM game_sessions
      WHERE alien_id = ${sub}
      ORDER BY created_at DESC
      LIMIT 50
    `)) as any;

    return NextResponse.json(result.rows);
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    if (error instanceof JwtErrors.JOSEError) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    console.error('Error in /api/game/history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
