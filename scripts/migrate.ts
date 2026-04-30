#!/usr/bin/env bun
/**
 * Migration script. Can be run manually or enabled during build
 * by setting RUN_MIGRATIONS=true in your environment.
 *
 * Usage:
 *   bun run scripts/migrate.ts
 */

export {};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("⏭️  DATABASE_URL not set, skipping migrations");
  process.exit(0);
}

const { migrateDb } = await import("../lib/db");

try {
  await migrateDb();
} catch {
  process.exit(1);
}
