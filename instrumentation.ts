export async function register() {
  if (process.env.RUN_MIGRATIONS !== "true") return;

  const { migrateDb } = await import("./lib/db");
  await migrateDb();
}
