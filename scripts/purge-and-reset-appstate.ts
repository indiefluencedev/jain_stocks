import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { seed, getDB } from "../src/lib/store";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_NEON_DB_URI;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is missing");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function purgeAndResetAppState() {
  console.log("🧹 Purging all sample/demo transaction logs, ledger entries, and demo users...");

  // Generate clean database structure with seed()
  seed();
  const db = getDB();

  try {
    // 1. Clear relational tables
    console.log("Deleting rows from relational transaction tables...");
    await sql`DELETE FROM "stock_ledger"`;
    await sql`DELETE FROM "requests"`;
    await sql`DELETE FROM "challans"`;
    await sql`DELETE FROM "inwards"`;
    await sql`DELETE FROM "audit_logs"`;
    await sql`DELETE FROM "user" WHERE role != 'super_admin' AND username != 'superadmin'`;

    console.log("✅ Relational tables cleared!");

    // 2. Overwrite full_store in app_state table with clean snapshot
    console.log("Overwriting app_state table 'full_store' key with clean JSON snapshot...");
    await sql`
      INSERT INTO "app_state" (key, value, updated_at)
      VALUES ('full_store', ${JSON.stringify(db)}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();
    `;

    console.log("🎉 SUCCESS: app_state table updated with clean snapshot! All metrics are now strictly live DB data.");
  } catch (err) {
    console.error("❌ Error purging app_state:", err);
    process.exit(1);
  }
}

purgeAndResetAppState();
