import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_NEON_DB_URI;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is missing in environment");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function setupDatabase() {
  console.log("⚡ Setting up Better Auth & Domain Schema with UUID Primary Keys & Candidate Keys in Neon PostgreSQL...");

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;

    // Drop existing tables cleanly to re-scaffold with UUID Primary Keys if needed
    await sql`DROP TABLE IF EXISTS "audit_logs" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "inwards" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "challans" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "requests" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "stock_ledger" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "parts" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "destinations" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "verification" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "account" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "session" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "user" CASCADE;`;
    await sql`DROP TABLE IF EXISTS "app_state" CASCADE;`;

    // 1. Better Auth & User Table with UUID PK & Username/Email Candidate Keys
    await sql`
      CREATE TABLE "user" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_code" TEXT UNIQUE,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        "image" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "role" TEXT NOT NULL DEFAULT 'viewer',
        "username" TEXT UNIQUE,
        "phone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "defaultDestinationId" UUID,
        "banned" BOOLEAN DEFAULT FALSE,
        "banReason" TEXT,
        "banExpires" TIMESTAMP WITH TIME ZONE,
        "salt" TEXT,
        "hash" TEXT,
        "lastLogin" TIMESTAMP WITH TIME ZONE
      );
    `;

    await sql`
      CREATE TABLE "session" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "activeOrganizationId" TEXT,
        "impersonatedBy" TEXT
      );
    `;

    await sql`
      CREATE TABLE "account" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "scope" TEXT,
        "password" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE "verification" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "identifier" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Destinations with UUID PK & Code Candidate Key
    await sql`
      CREATE TABLE "destinations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" TEXT UNIQUE,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "note" TEXT DEFAULT '',
        "address" TEXT,
        "contact_person" TEXT,
        "phone" TEXT,
        "is_virtual" BOOLEAN DEFAULT FALSE,
        "status" TEXT DEFAULT 'active',
        "active" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Parts with UUID PK & Part Code Candidate Key
    await sql`
      CREATE TABLE "parts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "part_code" TEXT NOT NULL UNIQUE,
        "part_number" TEXT,
        "sku" TEXT,
        "name" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "model" TEXT DEFAULT 'Universal',
        "uom" TEXT DEFAULT 'Nos',
        "rack" TEXT,
        "purchase_price" NUMERIC(12,2) DEFAULT 0.00,
        "selling_price" NUMERIC(12,2) DEFAULT 0.00,
        "gst" NUMERIC(5,2) DEFAULT 18.00,
        "min_qty" INTEGER DEFAULT 2,
        "max_qty" INTEGER DEFAULT 10,
        "barcode" TEXT,
        "description" TEXT,
        "active" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Stock Ledger with UUID PK & Entry Code Candidate Key
    await sql`
      CREATE TABLE "stock_ledger" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "entry_code" TEXT UNIQUE,
        "ts" BIGINT NOT NULL DEFAULT 0,
        "type" TEXT NOT NULL,
        "entry_type" TEXT,
        "part_id" UUID REFERENCES "parts"("id"),
        "part_code" TEXT NOT NULL,
        "part_name" TEXT NOT NULL,
        "qty" INTEGER NOT NULL,
        "quantity" INTEGER,
        "before" INTEGER NOT NULL DEFAULT 0,
        "after" INTEGER NOT NULL DEFAULT 0,
        "user_id" UUID REFERENCES "user"("id"),
        "created_by" UUID REFERENCES "user"("id"),
        "user_name" TEXT NOT NULL,
        "user_role" TEXT,
        "destination_id" UUID REFERENCES "destinations"("id"),
        "destination_name" TEXT,
        "chassis" TEXT,
        "model" TEXT,
        "sales_invoice" TEXT,
        "supplier_invoice" TEXT,
        "grn_no" TEXT,
        "challan_no" TEXT,
        "request_no" TEXT,
        "requested_by" TEXT,
        "issued_by" TEXT,
        "return_no" TEXT,
        "adjust_no" TEXT,
        "reason" TEXT,
        "remarks" TEXT,
        "reverses_id" UUID REFERENCES "stock_ledger"("id")
      );
    `;

    // 5. Requests with UUID PK & Request No Candidate Key
    await sql`
      CREATE TABLE "requests" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "no" TEXT NOT NULL UNIQUE,
        "request_number" TEXT,
        "ts" BIGINT NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'Requested',
        "destination_id" UUID REFERENCES "destinations"("id"),
        "destination_name" TEXT NOT NULL,
        "dest_type" TEXT NOT NULL,
        "chassis" TEXT,
        "model" TEXT,
        "sales_invoice" TEXT,
        "customer" TEXT,
        "items" JSONB NOT NULL DEFAULT '[]',
        "remarks" TEXT,
        "requested_by_id" UUID REFERENCES "user"("id"),
        "requester_id" UUID REFERENCES "user"("id"),
        "requested_by_name" TEXT NOT NULL,
        "created_by_id" UUID REFERENCES "user"("id"),
        "created_by_name" TEXT NOT NULL,
        "approved_by_name" TEXT,
        "history" JSONB NOT NULL DEFAULT '[]',
        "challans" JSONB NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 6. Challans with UUID PK & Challan No Candidate Key
    await sql`
      CREATE TABLE "challans" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "no" TEXT NOT NULL UNIQUE,
        "challan_number" TEXT,
        "ts" BIGINT NOT NULL DEFAULT 0,
        "request_id" UUID REFERENCES "requests"("id"),
        "request_no" TEXT NOT NULL,
        "destination_id" UUID REFERENCES "destinations"("id"),
        "destination_name" TEXT NOT NULL,
        "dest_type" TEXT NOT NULL,
        "chassis" TEXT,
        "model" TEXT,
        "sales_invoice" TEXT,
        "customer" TEXT,
        "items" JSONB NOT NULL DEFAULT '[]',
        "requested_by_name" TEXT NOT NULL,
        "issued_by_id" UUID REFERENCES "user"("id"),
        "issuer_id" UUID REFERENCES "user"("id"),
        "issued_by_name" TEXT NOT NULL,
        "remarks" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 7. Inwards with UUID PK & Inward No Candidate Key
    await sql`
      CREATE TABLE "inwards" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "no" TEXT NOT NULL UNIQUE,
        "ts" BIGINT NOT NULL DEFAULT 0,
        "invoice_no" TEXT NOT NULL,
        "invoice_date" TEXT,
        "supplier" TEXT,
        "lines" JSONB NOT NULL DEFAULT '[]',
        "user_id" UUID REFERENCES "user"("id"),
        "user_name" TEXT NOT NULL,
        "remarks" TEXT
      );
    `;

    // 8. Audit Logs with UUID PK & Audit Code Candidate Key
    await sql`
      CREATE TABLE "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "audit_code" TEXT,
        "ts" BIGINT NOT NULL DEFAULT 0,
        "user_id" UUID REFERENCES "user"("id"),
        "user_name" TEXT,
        "role" TEXT,
        "action" TEXT NOT NULL,
        "detail" TEXT,
        "entity" TEXT,
        "entity_type" TEXT,
        "entity_id" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 9. App State JSON snapshot table
    await sql`
      CREATE TABLE "app_state" (
        "key" TEXT PRIMARY KEY,
        "value" JSONB NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log("✅ All Neon PostgreSQL tables successfully configured with UUID Primary Keys & Candidate Keys!");
  } catch (error) {
    console.error("❌ Error running database setup:", error);
    process.exit(1);
  }
}

setupDatabase();
