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
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

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
