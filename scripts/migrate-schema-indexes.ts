/**
 * @file scripts/migrate-schema-indexes.ts
 * @description Database Schema Hardening & B-Tree Index Migration Script for Neon PostgreSQL.
 * 
 * Creates B-Tree performance indexes across stock_ledger, requests, parts, destinations,
 * challans, inwards, and audit_logs tables to support high-speed server-side SQL pagination,
 * dynamic stock calculations, and search filtering.
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

async function runIndexMigration() {
  console.log("⚡ Starting Database Schema Hardening & B-Tree Index Migration on Neon PostgreSQL...\n");

  const indexes = [
    // 1. Stock Ledger B-Tree Indexes (Dynamic Stock Calculation & Ledger Filtering)
    { name: "idx_ledger_part_id", table: "stock_ledger", ddl: `CREATE INDEX IF NOT EXISTS idx_ledger_part_id ON "stock_ledger"(part_id);` },
    { name: "idx_ledger_destination_id", table: "stock_ledger", ddl: `CREATE INDEX IF NOT EXISTS idx_ledger_destination_id ON "stock_ledger"(destination_id);` },
    { name: "idx_ledger_ts", table: "stock_ledger", ddl: `CREATE INDEX IF NOT EXISTS idx_ledger_ts ON "stock_ledger"(ts DESC);` },
    { name: "idx_ledger_type", table: "stock_ledger", ddl: `CREATE INDEX IF NOT EXISTS idx_ledger_type ON "stock_ledger"(type);` },
    { name: "idx_ledger_challan_no", table: "stock_ledger", ddl: `CREATE INDEX IF NOT EXISTS idx_ledger_challan_no ON "stock_ledger"(challan_no);` },
    { name: "idx_ledger_request_no", table: "stock_ledger", ddl: `CREATE INDEX IF NOT EXISTS idx_ledger_request_no ON "stock_ledger"(request_no);` },
    { name: "idx_ledger_user_id", table: "stock_ledger", ddl: `CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON "stock_ledger"(user_id);` },

    // 2. Stock Requests B-Tree Indexes (Status & Requester Filtering)
    { name: "idx_requests_status", table: "requests", ddl: `CREATE INDEX IF NOT EXISTS idx_requests_status ON "requests"(status);` },
    { name: "idx_requests_requested_by", table: "requests", ddl: `CREATE INDEX IF NOT EXISTS idx_requests_requested_by ON "requests"(requested_by_id);` },
    { name: "idx_requests_destination_id", table: "requests", ddl: `CREATE INDEX IF NOT EXISTS idx_requests_destination_id ON "requests"(destination_id);` },
    { name: "idx_requests_ts", table: "requests", ddl: `CREATE INDEX IF NOT EXISTS idx_requests_ts ON "requests"(ts DESC);` },

    // 3. Parts Catalog B-Tree Indexes (Search & Category Filtering)
    { name: "idx_parts_part_code", table: "parts", ddl: `CREATE INDEX IF NOT EXISTS idx_parts_part_code ON "parts"(part_code);` },
    { name: "idx_parts_category", table: "parts", ddl: `CREATE INDEX IF NOT EXISTS idx_parts_category ON "parts"(category);` },
    { name: "idx_parts_active", table: "parts", ddl: `CREATE INDEX IF NOT EXISTS idx_parts_active ON "parts"(active);` },
    { name: "idx_parts_name", table: "parts", ddl: `CREATE INDEX IF NOT EXISTS idx_parts_name ON "parts"(name);` },

    // 4. Destinations B-Tree Indexes
    { name: "idx_destinations_code", table: "destinations", ddl: `CREATE INDEX IF NOT EXISTS idx_destinations_code ON "destinations"(code);` },
    { name: "idx_destinations_type", table: "destinations", ddl: `CREATE INDEX IF NOT EXISTS idx_destinations_type ON "destinations"(type);` },
    { name: "idx_destinations_active", table: "destinations", ddl: `CREATE INDEX IF NOT EXISTS idx_destinations_active ON "destinations"(active);` },

    // 5. Challans B-Tree Indexes
    { name: "idx_challans_ts", table: "challans", ddl: `CREATE INDEX IF NOT EXISTS idx_challans_ts ON "challans"(ts DESC);` },
    { name: "idx_challans_request_no", table: "challans", ddl: `CREATE INDEX IF NOT EXISTS idx_challans_request_no ON "challans"(request_no);` },
    { name: "idx_challans_destination_id", table: "challans", ddl: `CREATE INDEX IF NOT EXISTS idx_challans_destination_id ON "challans"(destination_id);` },

    // 6. Inwards B-Tree Indexes
    { name: "idx_inwards_ts", table: "inwards", ddl: `CREATE INDEX IF NOT EXISTS idx_inwards_ts ON "inwards"(ts DESC);` },
    { name: "idx_inwards_invoice_no", table: "inwards", ddl: `CREATE INDEX IF NOT EXISTS idx_inwards_invoice_no ON "inwards"(invoice_no);` },

    // 7. Audit Logs B-Tree Indexes
    { name: "idx_audit_logs_ts", table: "audit_logs", ddl: `CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON "audit_logs"(ts DESC);` },
    { name: "idx_audit_logs_user_id", table: "audit_logs", ddl: `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON "audit_logs"(user_id);` },
    { name: "idx_audit_logs_action", table: "audit_logs", ddl: `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON "audit_logs"(action);` },
  ];

  let appliedCount = 0;

  for (const idx of indexes) {
    try {
      await sql.query(idx.ddl);
      console.log(`  ✓ Index created/verified: ${idx.name} on table "${idx.table}"`);
      appliedCount++;
    } catch (err: any) {
      console.error(`  ❌ Failed to create index ${idx.name}:`, err.message);
    }
  }

  console.log(`\n🎉 Index migration complete! Successfully applied/verified ${appliedCount}/${indexes.length} B-Tree indexes.`);

  // Verify created indexes from pg_indexes
  console.log("\n📊 Verifying active indexes in Neon DB schema:");
  const verifiedRows = await sql`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname;
  `;

  console.table(verifiedRows);
}

runIndexMigration().catch((err) => {
  console.error("❌ Migration failed with unhandled error:", err);
  process.exit(1);
});
