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
