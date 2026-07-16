#!/usr/bin/env node
/**
 * Post-build migration runner.
 *
 * Runs the SQL files in supabase/migrations/ against the subscriber's
 * Supabase database, in filename order.
 *
 * Behavior:
 *   - If POSTGRES_URL_NON_POOLING is not set, we're on the subscriber's
 *     first-ever deploy (before the Vercel–Supabase integration has run).
 *     Log and skip. The next deploy will run migrations.
 *   - If the connection string is set, connect and run every migration file.
 *     Every migration uses `create ... if not exists` / `on conflict`
 *     guards, so running the same file on every deploy is safe.
 *   - Any migration failure exits non-zero, which fails the deploy. That is
 *     intentional: a broken database deploy should stop before it can serve
 *     confusing pages to the subscriber.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const connectionString = process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.log(
    "[migrate] Skipping migrations — POSTGRES_URL_NON_POOLING not set. " +
      "This is expected on your first deploy, before the Vercel–Supabase " +
      "integration has finished. The next deploy will run migrations.",
  );
  process.exit(0);
}

async function main() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("[migrate] No migration files found in supabase/migrations/. Nothing to do.");
    process.exit(0);
  }

  const sql = postgres(connectionString, {
    max: 1,
    ssl: "require",
    idle_timeout: 5,
    connect_timeout: 15,
  });

  console.log(`[migrate] Running ${files.length} migration(s)…`);

  try {
    for (const file of files) {
      const path = join(migrationsDir, file);
      const content = readFileSync(path, "utf8");
      console.log(`[migrate] Applying ${file}`);
      await sql.unsafe(content);
    }
    console.log("[migrate] All migrations applied successfully.");
  } catch (err) {
    console.error("[migrate] Migration failed:", err instanceof Error ? err.message : err);
    await sql.end({ timeout: 5 });
    process.exit(1);
  }

  await sql.end({ timeout: 5 });
  process.exit(0);
}

main().catch((err) => {
  console.error("[migrate] Unexpected error:", err);
  process.exit(1);
});
