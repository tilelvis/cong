import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (!_db) {
    const { DATABASE_URL } = getServerEnv();

    _db = drizzle(postgres(DATABASE_URL, { max: 10, idle_timeout: 20, connect_timeout: 10 }), {
      schema,
    });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    const instance = getDb();
    const value = instance[prop as keyof typeof instance];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export async function migrateDb() {
  console.log("Running database migrations...");
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.log("Migrations completed.");
}

export { schema };
