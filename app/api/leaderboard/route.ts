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

    const top = (await db.execute(sql`
      SELECT alien_id, total_points, novice_points, soldier_points,
             expert_points, games_won, games_played,
             RANK() OVER (ORDER BY total_points DESC) as rank
      FROM game_wallets
      WHERE games_played > 0
      ORDER BY total_points DESC
      LIMIT 50
    `)) as any;

    const me = (await db.execute(sql`
      SELECT total_points, novice_points, soldier_points, expert_points,
             games_won, games_played,
             RANK() OVER (ORDER BY total_points DESC) as rank
      FROM game_wallets WHERE alien_id = ${sub}
    `)) as any;

    return NextResponse.json({ leaderboard: top.rows, me: me.rows[0] ?? null });
  } catch (error) {
    if (error instanceof JwtErrors.JWTExpired) return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    if (error instanceof JwtErrors.JOSEError) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    console.error('Error in /api/leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
