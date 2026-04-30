# PHASE 2 — DATABASE
# Add game-specific tables to Neon and update the Drizzle schema.
# Prerequisite: Phase 1 complete and green.

---

## STEP 1 — Add Game Tables in Neon SQL Editor

1. Go to https://neon.tech → your `congruence` project
2. Click **SQL Editor** in the left sidebar
3. Paste and run the following SQL:

```sql
CREATE TABLE IF NOT EXISTS game_wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  alien_id TEXT NOT NULL UNIQUE REFERENCES users(alien_id),
  trials INTEGER NOT NULL DEFAULT 5,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  novice_points INTEGER NOT NULL DEFAULT 0,
  soldier_points INTEGER NOT NULL DEFAULT 0,
  expert_points INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  hints_used_total INTEGER NOT NULL DEFAULT 0,
  last_spent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  alien_id TEXT NOT NULL REFERENCES users(alien_id),
  difficulty TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'cadet',
  grid_size INTEGER NOT NULL,
  puzzle JSONB NOT NULL,
  solution JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  score INTEGER,
  points_earned INTEGER,
  time_taken_ms INTEGER,
  hints_used INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  base_score INTEGER,
  time_bonus INTEGER,
  hint_penalty INTEGER,
  error_penalty INTEGER,
  streak_bonus INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

4. Click **Run**
5. Go to **Tables** in the left sidebar — confirm `game_wallets` and `game_sessions` now appear alongside `users`, `payment_intents`, `transactions`

---

## STEP 2 — Replace `lib/db/schema.ts`

Replace the entire file with the schema that includes all game tables and their relations:

```ts
import { pgTable, text, timestamp, uuid, jsonb, integer } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  alienId: text("alien_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

export const gameWallets = pgTable("game_wallets", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  alienId: text("alien_id").notNull().unique().references(() => users.alienId),
  trials: integer("trials").notNull().default(5),
  totalPurchased: integer("total_purchased").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  novicePoints: integer("novice_points").notNull().default(0),
  soldierPoints: integer("soldier_points").notNull().default(0),
  expertPoints: integer("expert_points").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  hintsUsedTotal: integer("hints_used_total").notNull().default(0),
  lastSpentAt: timestamp("last_spent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GameWallet = typeof gameWallets.$inferSelect;

export const gameSessions = pgTable("game_sessions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  alienId: text("alien_id").notNull().references(() => users.alienId),
  difficulty: text("difficulty").notNull(),
  level: text("level").notNull().default("cadet"),
  gridSize: integer("grid_size").notNull(),
  puzzle: jsonb("puzzle").notNull(),
  solution: jsonb("solution").notNull(),
  status: text("status").notNull().default("active"),
  score: integer("score"),
  pointsEarned: integer("points_earned"),
  timeTakenMs: integer("time_taken_ms"),
  hintsUsed: integer("hints_used").notNull().default(0),
  errors: integer("errors").notNull().default(0),
  baseScore: integer("base_score"),
  timeBonus: integer("time_bonus"),
  hintPenalty: integer("hint_penalty"),
  errorPenalty: integer("error_penalty"),
  streakBonus: integer("streak_bonus"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type GameSession = typeof gameSessions.$inferSelect;

export const paymentIntents = pgTable("payment_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoice: text("invoice").notNull().unique(),
  senderAlienId: text("sender_alien_id").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  amount: text("amount").notNull(),
  token: text("token").notNull(),
  network: text("network").notNull(),
  productId: text("product_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentIntent = typeof paymentIntents.$inferSelect;

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderAlienId: text("sender_alien_id"),
  recipientAddress: text("recipient_address").notNull(),
  txHash: text("tx_hash"),
  status: text("status").notNull(),
  amount: text("amount"),
  token: text("token"),
  network: text("network"),
  invoice: text("invoice"),
  test: text("test"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(gameWallets, {
    fields: [users.alienId],
    references: [gameWallets.alienId],
  }),
  sessions: many(gameSessions),
}));

export const gameWalletsRelations = relations(gameWallets, ({ one }) => ({
  user: one(users, {
    fields: [gameWallets.alienId],
    references: [users.alienId],
  }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  user: one(users, {
    fields: [gameSessions.alienId],
    references: [users.alienId],
  }),
}));
```

---

## STEP 3 — Commit and Deploy

```bash
git add .
git commit -m "Phase 2: game tables + schema"
git push
```

Vercel will auto-deploy. Wait for green build before continuing.

---

## PHASE 2 COMPLETE CHECKLIST

- [ ] `game_wallets` table exists in Neon with all columns
- [ ] `game_sessions` table exists in Neon with all columns
- [ ] `lib/db/schema.ts` updated and matches the SQL tables exactly
- [ ] Build passes on Vercel with no TypeScript errors
