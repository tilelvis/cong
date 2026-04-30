# PHASE 7 — DEPLOY & TEST
# Full end-to-end verification inside the Alien app.
# Prerequisite: Phase 6 complete — green Vercel build.

---

## STEP 1 — Final deploy

```bash
git add .
git commit -m "Phase 7: final deploy"
git push
```

Wait for Vercel to show a green deployment before testing anything.

---

## STEP 2 — Verify environment variables in Vercel

Go to Vercel → your project → **Settings** → **Environment Variables**.
Confirm all 5 are present and non-empty:

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon → your project → Connection Details |
| `ALIEN_JWKS_URL` | Must be exactly: `https://sso.alien-api.com/oauth/jwks` |
| `WEBHOOK_PUBLIC_KEY` | dev.alien.org → Webhooks → your webhook → Ed25519 public key |
| `NEXT_PUBLIC_RECIPIENT_ADDRESS` | Your Solana wallet address (can be blank if not using USDC) |
| `NEXT_PUBLIC_ALIEN_RECIPIENT_ADDRESS` | dev.alien.org → your app → Provider Address |

If any variable was recently changed, redeploy after saving.

---

## STEP 3 — Open the app inside the Alien app

Open the Alien app on your phone → navigate to your Mini App.

**Expected on load:**
- Black screen with floating 🛸 briefly, then home screen appears
- Your rank badge (`🌑 Dark Matter` or higher) in the top left
- 4 stat cards: POINTS, WINS, STREAK, TRIALS
- `▶ LAUNCH MISSION` button
- `⚡ GET TRIALS` and `🌌 LEADERBOARD` buttons

If you see "Open inside the Alien app" — the bridge is not connecting.
Check that the Mini App URL on dev.alien.org exactly matches your Vercel domain.

---

## STEP 4 — Test: Play a game

1. Tap **LAUNCH MISSION**
2. Select **CADET** (easiest — 5×5 grid, 5 hints)
3. Confirm: trial counter on home decreases by 1 when you return
4. The grid must render with colored cage borders and small `✦N` labels
5. Tap a cell — it highlights with a green glow border
6. Tap a number on the pad — it fills the cell and auto-advances
7. Fill a wrong number in the same row/column — it turns red immediately
8. Tap **↩ UNDO** — the cell reverts to its previous value
9. Tap **✏ NOTES OFF** to toggle pencil mode — tapping numbers now adds notes
10. Tap **💡 HINT (5)** — one empty cell fills with the correct value, hint count drops to 4
11. Solve the puzzle (or fill it in using hints)
12. The result screen must show: 🏆, "PUZZLE SOLVED", final score with breakdown

**Check in Neon SQL Editor:**
```sql
SELECT id, status, score, hints_used, errors, level
FROM game_sessions
ORDER BY created_at DESC
LIMIT 3;
```
The latest row must have `status = 'won'` and a real `score` value.

---

## STEP 5 — Test: Buy trials

1. Tap **⚡ GET TRIALS**
2. The GET TRIALS sheet slides up showing your current trial balance
3. Tap **10 Trials** (10 ALIEN)
4. The Alien native payment UI opens
5. Approve the payment
6. Status message shows "✅ Payment confirmed! +10 trials incoming..."
7. Within 30 seconds the trial counter must update

**Check in Neon SQL Editor:**
```sql
SELECT alien_id, trials, total_purchased
FROM game_wallets
ORDER BY updated_at DESC
LIMIT 3;
```
`trials` must have increased and `total_purchased` must reflect the purchase.

**Check Vercel function logs:**
Go to Vercel → Functions → `api/webhooks/payment`
You should see a `200 OK` response logged after the payment.

If you see a `401` on the webhook:
- The `WEBHOOK_PUBLIC_KEY` in Vercel doesn't match the key on dev.alien.org
- Delete the webhook on dev.alien.org, recreate it, copy the new key, update Vercel, redeploy

---

## STEP 6 — Test: Purchase history

1. In the GET TRIALS sheet, tap **HISTORY** tab
2. Your purchase must appear with product name, trials credited, date, and ✅ PAID status

If history shows empty despite a successful purchase:
- The `purchase-history` route JOINs `transactions` with `payment_intents` on the `invoice` field
- Check Neon: `SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;`
- If `invoice` column is null in transactions, the webhook is not passing the invoice through

---

## STEP 7 — Test: Leaderboard

1. Tap **🌌 LEADERBOARD**
2. Your rank card must show at the top with your points and rank badge
3. Play 2-3 games and solve them — your points must increase
4. Return to leaderboard — rank must update

---

## STEP 8 — Test: Profile and badges

1. Tap the rank badge button in the top right of the home screen
2. Profile shows: rank emoji, rank name, total points, progress bar to next rank
3. Win/loss stats: WINS, PLAYED, WIN RATE, BEST STREAK
4. Three badge tier sections: NOVICE, SOLDIER, EXPERT
5. Earned badges appear colored, unearned appear greyed out

---

## STEP 9 — Test: Free trial refill

1. Use all your trials (or set `trials = 0` in Neon for testing)
2. Wait 10 minutes
3. Close and reopen the app
4. Trial counter must show +5

To test immediately without waiting, run in Neon SQL Editor:
```sql
UPDATE game_wallets
SET last_spent_at = NOW() - INTERVAL '11 minutes'
WHERE alien_id = 'your_alien_id';
```
Then reload the app. 5 trials must be credited immediately.

---

## STEP 10 — Test: Security

These requests must all return errors, not succeed:

**Missing auth token:**
```bash
curl -X POST https://YOUR_VERCEL_DOMAIN/api/game/start \
  -H "Content-Type: application/json" \
  -d '{"level":"cadet"}'
```
Expected: `401 Unauthorized`

**Invalid level:**
```bash
curl -X POST https://YOUR_VERCEL_DOMAIN/api/game/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level":"god-mode"}'
```
Expected: `400` with error message about valid levels

**Invalid sessionId format:**
```bash
curl -X POST https://YOUR_VERCEL_DOMAIN/api/game/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"not-a-uuid","timeTakenMs":5000,"hintsUsed":0,"errorCount":0}'
```
Expected: `400` with "sessionId must be a valid UUID"

---

## PHASE 7 COMPLETE CHECKLIST

- [ ] App loads inside Alien app — home screen renders
- [ ] Game starts — trial deducts, puzzle renders with cages
- [ ] Puzzle solve — result screen shows score breakdown
- [ ] Quit mid-game — streak resets, session marked lost in DB
- [ ] Buy trials — payment goes through, webhook fires, `game_wallets.trials` increments
- [ ] Purchase history — shows product name and trials credited
- [ ] Leaderboard — your rank appears after solving games
- [ ] Profile — badges and progress bar correct
- [ ] Free refill — 5 trials credited after 10 minutes since last spend
- [ ] Security — unauthenticated and malformed requests rejected correctly
