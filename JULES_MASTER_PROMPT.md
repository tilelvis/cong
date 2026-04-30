# CONGRUENCE — MASTER BUILD PROMPT FOR JULES
# Copy this entire file as your Jules task prompt.
# This is a single orchestrated build across 8 phases.

---

## ROLE AND OBJECTIVE

You are a senior full-stack engineer building a production Mini App called
**Congruence** for the Alien platform. Your task is to execute all 8 build
phases in sequence, following the phase documentation exactly.

All phase documentation is located at:
`github.com/tilelvis/cong/tree/main/build/`

Files:
- `PHASE_1_FOUNDATION.md`
- `PHASE_2_DATABASE.md`
- `PHASE_3_PAYMENTS.md`
- `PHASE_4_GAME_ENGINE.md`
- `PHASE_5_UI.md`
- `PHASE_6_SECURITY.md`
- `PHASE_7_DEPLOY_TEST.md`
- `PHASE_8_ISSUES_FUTURE.md`

---

## OPERATING RULES — READ BEFORE TOUCHING ANY FILE

**Rule 1 — Phases are sequential. Never skip.**
Complete every checklist item in a phase before moving to the next.
A phase is complete only when its checklist is fully checked off and
the Vercel build is green.

**Rule 2 — Phase docs are the source of truth.**
Every file path, every function name, every SQL statement, every import
comes from the phase doc. If the doc says `import { useAlien } from '@alien_org/react'`
you write exactly that. Do not substitute, rename, or improve without a reason
documented in this prompt.

**Rule 3 — Do not touch files not listed in the current phase.**
Each phase lists exactly which files to create or modify. Files not on that list
are off-limits for that phase. This prevents regressions.

**Rule 4 — Package name is `@alien_org/react` (underscore, not hyphen).**
The correct import for the Alien React SDK is always:
```ts
import { useAlien, usePayment } from '@alien_org/react';
```
Never use `@alien-id/miniapps-react` or `@alien_org/miniapps-react`.

**Rule 5 — `usePayment` returns `pay()`, not `purchase()` or `buy()`.**
The payment hook API is:
```ts
const { pay } = usePayment({ onPaid, onCancelled, onFailed });
pay({ recipient, amount, token, network, invoice, item });
```
`pay()` is NOT async — do not await it. Results arrive via callbacks.

**Rule 6 — All DB queries use `sql` tagged templates.**
Never build SQL strings with concatenation or template literals.
Every query must follow this pattern:
```ts
await db.execute(sql`SELECT ... WHERE alien_id = ${auth.alienId}`);
```

**Rule 7 — Result rows are at `result.rows`, not `result` directly.**
After `db.execute()`, always access:
- `result.rows.length` (not `result.length`)
- `result.rows[0]` (not `result[0]`)

**Rule 8 — `verifyRequest` must be called at the top of every API route.**
Every route that touches the DB must start with:
```ts
const auth = await verifyRequest(req);
if (auth instanceof NextResponse) return auth;
```

**Rule 9 — The `game/start` route is NOT the boilerplate stub.**
The boilerplate ships with a mock `game/start` that returns `trialsRemaining: 10`
without touching the DB. Phase 6 replaces it entirely. Confirm the replacement
landed by checking the route calls `verifyRequest`, deducts trials from
`game_wallets`, and inserts a row into `game_sessions`.

**Rule 10 — Build must pass TypeScript before proceeding.**
After every phase, push to GitHub and wait for the Vercel build to go green.
A TypeScript error means the phase is not complete. Fix it before moving on.

---

## CRITICAL CONSTANTS — DO NOT DEVIATE

**DB result access pattern:**
```ts
const result = await db.execute(sql`...`);
if (result.rows.length === 0) { /* handle empty */ }
const row = result.rows[0] as YourInterface;
```

**Verifying auth in every route:**
```ts
import { verifyRequest } from '@/features/auth/server-lib';
const auth = await verifyRequest(req);
if (auth instanceof NextResponse) return auth;
// auth.alienId is now available
```

**Zod validation in every route that accepts a body:**
```ts
let body: unknown;
try { body = await req.json(); }
catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
const parsed = YourSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
}
```

**IDOR protection on every session query:**
```ts
WHERE id = ${sessionId} AND alien_id = ${auth.alienId}
```

**Sanitize before rendering user strings:**
```ts
import { sanitize } from '@/lib/sanitize';
// In JSX:
{sanitize(entry.alien_id)}
```

---

## PHASE EXECUTION PLAN

### PHASE 1 — Foundation
Read `PHASE_1_FOUNDATION.md` fully before taking any action.

Execute:
1. Clone the boilerplate: `git clone https://github.com/alien-id/miniapp-boilerplate congruence`
2. Install: `npm install`
3. Create `.env` from `.env.example` — fill all 5 variables (DATABASE_URL, ALIEN_JWKS_URL, WEBHOOK_PUBLIC_KEY, NEXT_PUBLIC_RECIPIENT_ADDRESS, NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS)
4. Replace `app/layout.tsx` with the version from Phase 1 — removes tab bar and padded wrapper
5. Run migrations: `npx drizzle-kit migrate`
6. Push to GitHub, deploy to Vercel with all 5 env vars set

**Gate:** Do not proceed until the app opens inside the Alien app and `/api/me` returns a real `alienId`.

---

### PHASE 2 — Database
Read `PHASE_2_DATABASE.md` fully before taking any action.

Execute:
1. Run the SQL in Neon SQL Editor — creates `game_wallets` and `game_sessions`
2. Replace `lib/db/schema.ts` with the version from Phase 2
3. Push and confirm green build

**Gate:** `game_wallets` and `game_sessions` tables visible in Neon Tables view.

---

### PHASE 3 — Payments
Read `PHASE_3_PAYMENTS.md` fully before taking any action.

Execute:
1. Register webhook on dev.alien.org — URL: `https://YOUR_VERCEL_DOMAIN/api/webhooks/payment`
2. Copy Ed25519 key → update `WEBHOOK_PUBLIC_KEY` in Vercel → redeploy
3. Add 4 trial pack entries to `features/payments/constants.ts` (trials-10, trials-25, trials-50, trials-100)
4. Replace `app/api/webhooks/payment/route.ts` with the version from Phase 3 — adds trial crediting
5. Create `app/api/purchase-history/route.ts`
6. Create `lib/deposit-packs.ts`
7. Push and deploy

**Gate:** Make a real test payment inside the Alien app. Confirm in Neon:
```sql
SELECT trials, total_purchased FROM game_wallets ORDER BY updated_at DESC LIMIT 1;
```
`trials` must have increased.

---

### PHASE 4 — Game Engine
Read `PHASE_4_GAME_ENGINE.md` fully before taking any action.

Execute in this exact order:
1. Create `lib/sanitize.ts`
2. Create `lib/schemas.ts`
3. Create `lib/badges.ts`
4. Create `lib/puzzle-engine.ts`
5. Create `app/api/game-wallet/route.ts`
6. Create `app/api/game/start/route.ts` — THIS IS THE FULL IMPLEMENTATION, NOT THE STUB
7. Create `app/api/game/submit/route.ts`
8. Create `app/api/game/fail/route.ts`
9. Create `app/api/game/history/route.ts`
10. Create `app/api/leaderboard/route.ts`
11. Push and deploy

**Gate:** All 6 routes return 200 when called from inside the Alien app (check Vercel function logs).

---

### PHASE 5 — UI
Read `PHASE_5_UI.md` fully before taking any action.

Execute in this exact order:
1. Replace `app/globals.css`
2. Replace `app/layout.tsx`
3. Create `components/GameBoard.tsx`
4. Create `components/GameWallet.tsx` — import MUST be `from '@alien_org/react'`
5. Replace `app/page.tsx` — import MUST be `from '@alien_org/react'`, includes `sanitize` import
6. Push and deploy

**Verify before pushing:**
- `components/GameWallet.tsx` line 1 imports: `import { useAlien, usePayment } from '@alien_org/react';`
- `app/page.tsx` line 1 imports: `import { useAlien } from '@alien_org/react';`
- `app/page.tsx` imports `sanitize` from `@/lib/sanitize`
- `app/page.tsx` uses `{sanitize(entry.alien_id)}` in the leaderboard render section
- No file imports from `@alien-id/miniapps-react` anywhere in the project

**Gate:** Home screen renders inside the Alien app with floating 🛸, rank badge, 4 stat cards, LAUNCH MISSION button.

---

### PHASE 6 — Security
Read `PHASE_6_SECURITY.md` fully before taking any action.

Execute:
1. Confirm `lib/schemas.ts` exists and is correct
2. Confirm `lib/sanitize.ts` exists and is correct
3. Replace `app/api/game/start/route.ts` — full secure implementation with verifyRequest + Zod + atomic trial deduction
4. Replace `app/api/game/submit/route.ts` — fixes `sessionResult.rows.length` and `walletResult.rows[0]` bugs
5. Replace `app/api/game/fail/route.ts` — adds Zod validation
6. Confirm `app/page.tsx` has `sanitize` import and wraps `entry.alien_id` in leaderboard
7. Confirm `app/api/invoices/route.ts` and `app/api/webhooks/payment/route.ts` are untouched
8. Push and deploy

**Security self-check before pushing:**
- Every game route starts with `verifyRequest` ✓
- Every session query has `AND alien_id = ${auth.alienId}` ✓
- Every route with a body has `StartGameSchema/SubmitGameSchema/FailGameSchema.safeParse` ✓
- `entry.alien_id` is wrapped in `sanitize()` in the leaderboard ✓
- All queries use `sql\`...\`` with parameterized values ✓

**Gate:** Build green. Calling `/api/game/start` without a token returns 401. Calling it with `{"level":"god-mode"}` returns 400.

---

### PHASE 7 — Deploy & Test
Read `PHASE_7_DEPLOY_TEST.md` fully before taking any action.

Execute the full test sequence inside the Alien app:
1. Home screen loads with correct stat cards
2. Start a Cadet game — trial deducts, puzzle renders with colored cage borders and ✦N labels
3. Tap a cell — highlights. Tap a number — fills and auto-advances.
4. Enter a duplicate in a row — turns red immediately
5. Use undo — reverts correctly
6. Use hint — fills one cell, decrements hint counter
7. Solve the puzzle — result screen shows score breakdown with base, time bonus, penalties, streak bonus
8. Buy trials — payment confirmed, balance updates within 30s
9. Check purchase history — shows product name and trials credited
10. Check leaderboard — your rank appears
11. Check profile — badge progression visible, progress bar to next rank shows

After every step, verify in Neon SQL Editor that the corresponding DB change happened.

---

### PHASE 8 — Known Issues & Future
Read `PHASE_8_ISSUES_FUTURE.md` for awareness.

Apply the two immediate fixes:
1. Extend polling to 20 attempts (40 seconds) in `components/GameWallet.tsx`
2. Wrap `handleSolve` in try/catch in `app/page.tsx` for network error resilience

Note the future improvements (tutorial, daily puzzle, airdrop snapshot, anti-cheat) for later build cycles.

---

## COMMON ERRORS AND HOW TO FIX THEM

| Error | Cause | Fix |
|---|---|---|
| `Property 'buy' does not exist on type...` | Wrong hook API — `useDiamondPurchase` used instead of `usePayment` | Use `const { pay } = usePayment({...})` from `@alien_org/react` |
| `Property 'recipientAddress' does not exist on DepositPack` | Old `depositPacks.ts` still has `recipientAddress` field | Remove `recipientAddress` from all 4 pack objects in `lib/deposit-packs.ts` |
| `Cannot find module '@/store/game-store'` | Dead file `components/GameGrid.tsx` not deleted | Delete `components/GameGrid.tsx` entirely |
| `<<<<<<< HEAD` merge conflict markers in GameBoard.tsx | Jules had a merge conflict that was committed | Replace the entire file with the version from Phase 5 |
| `relation "game_wallets" does not exist` | Phase 2 SQL not run | Open Neon SQL Editor and run the CREATE TABLE statements from Phase 2 |
| `column "level" does not exist` | Phase 2 SQL run before the `level` column was added | Run: `ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'cadet';` |
| `POST /api/game/start → 402 despite having trials` | Stub route was never replaced | Confirm `game/start/route.ts` calls `verifyRequest` and contains the UPDATE to `game_wallets` |
| `401 on webhook` | `WEBHOOK_PUBLIC_KEY` doesn't match dev.alien.org | Delete webhook on dev.alien.org, recreate, copy new key, update Vercel env var, redeploy |
| Trials don't update after payment | Polling ended before webhook fired | Check Vercel logs for `/api/webhooks/payment` — should show 200. If 401, see row above. |
| `trials_remaining: 10` always returned | Stub `game/start` still in place | Replace entire `app/api/game/start/route.ts` with Phase 6 version |

---

## FINAL VERIFICATION — ALL PHASES COMPLETE

When all 8 phases are done, this must all be true:

**Code:**
- [ ] No file imports from `@alien-id/miniapps-react`
- [ ] No `useDiamondPurchase` or `buy()` calls anywhere
- [ ] No `result.length` or `result[0]` on db.execute results
- [ ] No `product.recipientAddress` references in any file
- [ ] `components/GameGrid.tsx` does not exist
- [ ] No git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in any file
- [ ] `app/api/game/start/route.ts` calls `verifyRequest`, deducts trials, stores session

**Database (verify in Neon):**
- [ ] `game_wallets` table has columns: trials, total_points, current_streak, best_streak, last_spent_at
- [ ] `game_sessions` table has columns: level, points_earned, hints_used, errors

**Runtime (verify inside Alien app):**
- [ ] Game starts, deducts trial, renders puzzle with cage borders
- [ ] Solving a game records score in DB with correct status='won'
- [ ] Quitting resets streak (status='lost')
- [ ] Buying trials credits `game_wallets.trials` via webhook
- [ ] Purchase history shows product_id and trials_credited
- [ ] Leaderboard shows rank after games are played
