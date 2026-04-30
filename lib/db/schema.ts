import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  alienId: text("alien_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

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
