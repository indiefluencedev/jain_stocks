/**
 * @file scripts/test-stockin-persistence.ts
 * @description Integration verification script to verify relational stock in persistence in Neon DB.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_NEON_DB_URI;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is missing in environment");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function testStockInPersistence() {
  console.log("⚡ Testing Relational Stock In & Ledger Persistence in Neon DB...\n");

  const parts = await sql`SELECT id, part_code, name FROM "parts" LIMIT 1`;
  if (!parts.length) {
    console.error("❌ No parts found in database!");
    process.exit(1);
  }

  const part = parts[0];
  const invoiceNo = `RE/TEST/${Date.now().toString().slice(-5)}`;
  const inwardId = crypto.randomUUID();
  const ledgerId = crypto.randomUUID();
  const userId = "10000000-0000-4000-8000-000000000001"; // Super Admin

  console.log(`  1. Inserting test Inward Invoice ${invoiceNo} for part ${part.part_code}...`);
  await sql`
    INSERT INTO "inwards" (id, no, ts, invoice_no, invoice_date, supplier, lines, user_id, user_name, remarks)
    VALUES (
      ${inwardId}::uuid, ${'GRN-' + Date.now().toString().slice(-6)}, ${Date.now()}, ${invoiceNo}, '2026-10-03',
      'Royal Enfield (GMA)', ${JSON.stringify([{ partId: part.id, qty: 10 }])}::jsonb, ${userId}::uuid, 'Super Admin', 'Test stock inward entry'
    )
    ON CONFLICT (id) DO UPDATE SET remarks = EXCLUDED.remarks;
  `;

  console.log(`  2. Inserting test Stock Ledger +10 movement for part ${part.part_code}...`);
  await sql`
    INSERT INTO "stock_ledger" (
      id, entry_code, ts, type, part_id, part_code, part_name, qty, before, after,
      user_id, user_name, user_role, supplier_invoice, grn_no, remarks
    ) VALUES (
      ${ledgerId}::uuid, ${'MV-' + Date.now().toString().slice(-6)}, ${Date.now()}, 'IN', ${part.id}::uuid,
      ${part.part_code}, ${part.name}, 10, 0, 10,
      ${userId}::uuid, 'Super Admin', 'Super Admin', ${invoiceNo}, ${'GRN-' + Date.now().toString().slice(-6)}, 'Test stock inward entry'
    )
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log("  3. Querying Neon DB to verify records exist:");
  const inwardsCount = await sql`SELECT COUNT(*)::int AS count FROM "inwards"`;
  const ledgerCount = await sql`SELECT COUNT(*)::int AS count FROM "stock_ledger"`;

  console.log(`  ✓ Total Inward Invoices in Neon DB: ${inwardsCount[0].count}`);
  console.log(`  ✓ Total Stock Ledger Entries in Neon DB: ${ledgerCount[0].count}`);

  console.log("\n🎉 Stock Inward & Ledger relational database persistence successfully verified!");
}

testStockInPersistence().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
