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
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    
    const { sub } = await verifyToken(token);

    // 1. CRITICAL FIX: Ensure user exists in 'users' table first to satisfy Foreign Key
    // This handles implicit registration for first-time players.
    await db.execute(sql`
      INSERT INTO users (alien_id, updated_at)
      VALUES (${sub}, NOW())
      ON CONFLICT (alien_id) DO UPDATE SET updated_at = NOW()
    `);

    // 2. Ensure wallet exists
    await db.execute(sql`
      INSERT INTO game_wallets (alien_id, trials)
      VALUES (${sub}, 5)
      ON CONFLICT (alien_id) DO NOTHING
    `);

    // 3. Fetch current wallet state
    const result = (await db.execute(sql`
      SELECT trials, total_purchased, total_spent, last_spent_at,
             total_points, novice_points, soldier_points, expert_points,
             games_won, games_played, current_streak, best_streak
      FROM game_wallets WHERE alien_id = ${sub}
    `)) as any;

    const wallet = result.rows[0];
    if (!wallet) {
       return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // 4. Refill Logic
    let trialsToAdd = 0;
    if (wallet.last_spent_at) {
      const msSince = Date.now() - new Date(wallet.last_spent_at).getTime();
      const windows = Math.floor(msSince / REFILL_INTERVAL_MS);
      // Only add if user is below cap
      if (Number(wallet.trials) < REFILL_CAP) {
        trialsToAdd = Math.min(windows * REFILL_AMOUNT, REFILL_CAP - Number(wallet.trials));
      }
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
    if (error instanceof JwtErrors.JWTExpired) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    if (error instanceof JwtErrors.JOSEError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    console.error('Error in /api/game-wallet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
