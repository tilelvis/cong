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
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { sessionId, timeTakenMs, hintsUsed, errorCount } = parsed.data;

    const sessionResult = (await db.execute(sql`
      SELECT id, alien_id, level, status FROM game_sessions
      WHERE id = ${sessionId} AND alien_id = ${sub} AND status = 'active'
    `)) as any;

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionResult.rows[0] as GameSessionRow;

    const walletResult = (await db.execute(sql`
      SELECT current_streak FROM game_wallets WHERE alien_id = ${sub}
    `)) as any;
    const currentStreak = Number(walletResult.rows[0]?.current_streak ?? 0);

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
