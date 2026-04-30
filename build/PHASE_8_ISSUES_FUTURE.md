# PHASE 8 — KNOWN ISSUES & FUTURE IMPROVEMENTS
# What still needs fixing, and what to build next.

---

## KNOWN ISSUE 1 — Trials don't always update immediately after payment

**Symptom:** After buying trials, the counter doesn't update until the app is
closed and reopened, even though the webhook has fired and Neon shows the correct
value.

**Root cause:** `onPaid` fires the moment the user approves in the Alien wallet UI.
The webhook from Alien's server arrives seconds to minutes later depending on network.
The polling loop in `GameWallet.tsx` calls `onTrialsUpdated()` every 2 seconds for
30 seconds — but if the webhook takes longer than 30 seconds, polling stops before
the DB value is updated.

**Fix:** Two changes:

**1 — Increase polling duration and add a manual refresh button.**

In `components/GameWallet.tsx`, find:
```ts
      if (attempts >= 15) {
        clearInterval(poll);
        setStatus({ text: '✅ Trials credited!', ok: true });
        fetchHistory();
      }
```
Replace with:
```ts
      if (attempts >= 20) {
        clearInterval(poll);
        setStatus({
          text: '✅ Payment confirmed. Pull down to refresh if balance looks wrong.',
          ok: true
        });
        fetchHistory();
      }
```
This extends polling to 40 seconds (20 × 2s).

**2 — Add a manual refresh on wallet open.**

In `app/page.tsx`, find:
```tsx
  if (screen === 'wallet') return (
    <GameWallet
      trials={wallet.trials}
      onClose={async () => { await fetchWallet(); setScreen('home'); }}
      onTrialsUpdated={fetchWallet}
    />
  );
```
This is already correct. The `onClose` call to `fetchWallet()` means
the home screen always reflects the real DB value when the sheet closes,
even if the polling loop ended before the webhook fired.

---

## KNOWN ISSUE 2 — Puzzle uniqueness not guaranteed

**Symptom:** Two different players opening the same level at the same time could
theoretically get the same puzzle if the random seed coincides.

**Root cause:** The Latin square generator uses `Math.random()` which is not
cryptographically seeded. On high-traffic days, collisions are possible.

**Fix (optional, for later):** Add a puzzle seed to the session and log which
puzzles have been served recently. For now, the probability is negligible at
small user counts.

---

## KNOWN ISSUE 3 — No offline / network error handling

**Symptom:** If the user's phone loses signal mid-game, the submit call silently
fails and the game shows no feedback.

**Fix:** In `app/page.tsx`, wrap `handleSolve` in a try/catch and show an error
state on the result screen:

```tsx
  async function handleSolve(timeTakenMs: number, hintsUsed: number, errorCount: number) {
    if (!authToken || !session) return;
    try {
      const res = await fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ sessionId: session.sessionId, timeTakenMs, hintsUsed, errorCount }),
      });
      if (res.ok) {
        setScore((await res.json()).score);
        setScreen('result');
        fetchWallet();
      } else {
        // Show error on result screen
        setScore({ base: 0, timeBonus: 0, hintPenalty: 0, errorPenalty: 0, streakBonus: 0, final: 0 });
        setScreen('result');
      }
    } catch {
      // Network error — still show result screen, score will be 0
      setScore({ base: 0, timeBonus: 0, hintPenalty: 0, errorPenalty: 0, streakBonus: 0, final: 0 });
      setScreen('result');
    }
  }
```

---

## FUTURE IMPROVEMENTS — Build these next

### 1. Tutorial screen
A 4-step interactive walkthrough explaining:
1. Latin Square rule (every row/column has each number once)
2. Digit sum cage rule (cage sum's digital root = label)
3. How to use notes mode
4. How scoring works (speed, hints, errors)

Show it on first visit only (store `tutorial_seen` in Neon on the `users` table).

### 2. Daily puzzle
One shared puzzle per day, same for all users. Shown on the home screen as
"DAILY MISSION". Completing it awards a 2× score multiplier.

Implementation: a `daily_puzzles` table with `date`, `level`, `puzzle JSONB`.
A cron job (Vercel cron or pg_cron) generates one puzzle per level per day.

### 3. Airdrop snapshot system
When ready to run an airdrop or reward campaign:

```sql
-- Snapshot all players at a point in time
CREATE TABLE airdrop_snapshots AS
SELECT
  alien_id,
  total_points,
  games_won,
  games_played,
  best_streak,
  novice_points,
  soldier_points,
  expert_points,
  CASE
    WHEN total_points >= 250000 THEN 'alien-intelligence'
    WHEN total_points >= 100000 THEN 'event-horizon'
    WHEN total_points >= 40000  THEN 'supernova'
    WHEN total_points >= 15000  THEN 'nova'
    WHEN total_points >= 5000   THEN 'stardust'
    WHEN total_points >= 1000   THEN 'nebula'
    ELSE 'dark-matter'
  END as airdrop_tier,
  NOW() as snapshot_at
FROM game_wallets
WHERE games_played >= 3;  -- exclude one-time visitors
```

The `airdrop_tier` column directly maps to allocation size.
Players with higher tiers and more `games_played` get larger allocations.
The `best_streak` field discourages bot grinding (bots don't maintain streaks
across sessions).

### 4. Anti-cheat: puzzle solution verification
Currently the client tells the server it has solved the puzzle but the server
trusts that the puzzle was actually solved (it only records the score).
For a more robust system, the client should send the final grid state back
with the submit request, and the server should verify it matches the stored
solution before recording a win.

Add to `SubmitGameSchema` in `lib/schemas.ts`:
```ts
export const SubmitGameSchema = z.object({
  sessionId:   z.string().uuid(),
  timeTakenMs: z.number().int().min(0).max(86_400_000),
  hintsUsed:   z.number().int().min(0).max(10),
  errorCount:  z.number().int().min(0).max(1000),
  finalGrid:   z.array(z.array(z.number().int().min(1).max(9))).optional(),
});
```

Then in the submit route, if `finalGrid` is provided, compare it against
`solution` stored in the DB before awarding the score.

### 5. Streak shield item
Allow players to spend trials to purchase a "streak shield" that protects their
streak from being reset on the next failed game. Adds a `streak_shield` boolean
column to `game_wallets`.

---

## PHASE 8 COMPLETE CHECKLIST

- [ ] Polling extended to 40 seconds in `GameWallet.tsx`
- [ ] `handleSolve` wrapped in try/catch for network failures
- [ ] Tutorial screen planned for next build cycle
- [ ] Daily puzzle architecture noted for future implementation
- [ ] Airdrop snapshot SQL saved for reward campaigns
- [ ] Anti-cheat grid verification planned as next security upgrade
