import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import { seed, getDB, toUUID } from "../src/lib/store";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_NEON_DB_URI;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is missing");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function seedFullDatabase() {
  console.log("🌱 Running full seed simulation & population with UUID PKs into Neon PostgreSQL...");

  // Generate complete dataset using internal seed logic
  seed();
  const db = getDB();

  try {
    // 1. Seed Users
    console.log(`Inserting ${db.users.length} Users...`);
    for (const u of db.users) {
      const email = u.username + "@jainstock.com";
      await sql`
        INSERT INTO "user" (id, user_code, name, email, "emailVerified", role, username, phone, status, salt, hash, "createdAt", "lastLogin")
        VALUES (
          ${toUUID(u.id)},
          ${u.code || u.username},
          ${u.name},
          ${email},
          true,
          ${u.role},
          ${u.username},
          ${u.phone || ""},
          ${u.salt || ""},
          ${u.hash || ""},
          ${new Date(u.createdAt).toISOString()},
          ${u.lastLogin ? new Date(u.lastLogin).toISOString() : null}
        )
        ON CONFLICT (id) DO UPDATE SET
          user_code = EXCLUDED.user_code,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          username = EXCLUDED.username,
          salt = EXCLUDED.salt,
          hash = EXCLUDED.hash,
          status = EXCLUDED.status;
      `;
    }

    // 2. Seed Destinations
    console.log(`Inserting ${db.destinations.length} Destinations...`);
    for (const d of db.destinations) {
      await sql`
        INSERT INTO "destinations" (id, code, name, type, note, active)
        VALUES (${toUUID(d.id)}, ${d.code || d.id}, ${d.name}, ${d.type}, ${d.note || ""}, ${d.active})
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          note = EXCLUDED.note,
          active = EXCLUDED.active;
      `;
    }

    // 3. Seed Parts
    console.log(`Inserting ${db.parts.length} Parts...`);
    for (const p of db.parts) {
      await sql`
        INSERT INTO "parts" (
          id, part_code, part_number, sku, name, category, model, uom, rack,
          purchase_price, selling_price, gst, min_qty, max_qty, barcode, description, active
        ) VALUES (
          ${toUUID(p.id)}, ${p.partCode}, ${p.partCode}, ${p.sku}, ${p.name}, ${p.category}, ${p.model}, ${p.uom}, ${p.rack},
          ${p.purchasePrice}, ${p.sellingPrice}, ${p.gst}, ${p.minQty}, ${p.maxQty}, ${p.barcode}, ${p.description}, ${p.active}
        )
        ON CONFLICT (id) DO UPDATE SET
          part_code = EXCLUDED.part_code,
          part_number = EXCLUDED.part_number,
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          purchase_price = EXCLUDED.purchase_price,
          selling_price = EXCLUDED.selling_price;
      `;
    }

    // 4. Seed Stock Ledger
    console.log(`Inserting ${db.ledger.length} Ledger entries...`);
    for (const l of db.ledger) {
      await sql`
        INSERT INTO "stock_ledger" (
          id, entry_code, ts, type, entry_type, part_id, part_code, part_name, qty, quantity, before, after,
          user_id, created_by, user_name, user_role, destination_id, destination_name,
          chassis, model, sales_invoice, supplier_invoice, grn_no, challan_no,
          request_no, requested_by, issued_by, return_no, adjust_no, reason, remarks, reverses_id
        ) VALUES (
          ${toUUID(l.id)}, ${l.id}, ${l.ts}, ${l.type}, ${l.type}, ${toUUID(l.partId)}, ${l.partCode}, ${l.partName}, ${l.qty}, ${l.qty}, ${l.before}, ${l.after},
          ${toUUID(l.userId)}, ${toUUID(l.userId)}, ${l.userName}, ${l.userRole || ""}, ${l.destinationId ? toUUID(l.destinationId) : null}, ${l.destinationName || ""},
          ${l.chassis || ""}, ${l.model || ""}, ${l.salesInvoice || ""}, ${l.supplierInvoice || ""}, ${l.grnNo || ""}, ${l.challanNo || ""},
          ${l.requestNo || ""}, ${l.requestedBy || ""}, ${l.issuedBy || ""}, ${l.returnNo || ""}, ${l.adjustNo || ""}, ${l.reason || ""}, ${l.remarks || ""}, ${l.reversesId ? toUUID(l.reversesId) : null}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 5. Seed Requests
    console.log(`Inserting ${db.requests.length} Requests...`);
    for (const r of db.requests) {
      await sql`
        INSERT INTO "requests" (
          id, no, request_number, ts, status, destination_id, destination_name, dest_type, chassis, model,
          sales_invoice, customer, items, remarks, requested_by_id, requester_id, requested_by_name,
          created_by_id, created_by_name, approved_by_name, history, challans
        ) VALUES (
          ${toUUID(r.id)}, ${r.no}, ${r.no}, ${r.ts}, ${r.status}, ${toUUID(r.destinationId)}, ${r.destinationName}, ${r.destType},
          ${r.chassis || ""}, ${r.model || ""}, ${r.salesInvoice || ""}, ${r.customer || ""},
          ${JSON.stringify(r.items)}, ${r.remarks || ""}, ${toUUID(r.requestedById)}, ${toUUID(r.requestedById)}, ${r.requestedByName},
          ${toUUID(r.createdById)}, ${toUUID(r.createdById)}, ${r.approvedByName || null},
          ${JSON.stringify(r.history)}, ${JSON.stringify(r.challans)}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 6. Seed Challans
    console.log(`Inserting ${db.challans.length} Challans...`);
    for (const c of db.challans) {
      await sql`
        INSERT INTO "challans" (
          id, no, challan_number, ts, request_id, request_no, destination_id, destination_name, dest_type,
          chassis, model, sales_invoice, customer, items, requested_by_name, issued_by_id, issuer_id, issued_by_name, remarks
        ) VALUES (
          ${toUUID(c.no)}, ${c.no}, ${c.no}, ${c.ts}, ${toUUID(c.requestId)}, ${c.requestNo}, ${toUUID(c.destinationId)}, ${c.destinationName}, ${c.destType},
          ${c.chassis || ""}, ${c.model || ""}, ${c.salesInvoice || ""}, ${c.customer || ""},
          ${JSON.stringify(c.items)}, ${c.requestedByName}, ${toUUID(c.issuedById)}, ${toUUID(c.issuedById)}, ${c.issuedByName}, ${c.remarks || ""}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 7. Seed Inwards
    console.log(`Inserting ${db.inwards.length} Inwards...`);
    for (const i of db.inwards) {
      await sql`
        INSERT INTO "inwards" (
          id, no, ts, invoice_no, invoice_date, supplier, lines, user_id, user_name, remarks
        ) VALUES (
          ${toUUID(i.no)}, ${i.no}, ${i.ts}, ${i.invoiceNo}, ${i.invoiceDate || ""}, ${i.supplier || ""},
          ${JSON.stringify(i.lines)}, ${toUUID(i.userId)}, ${i.userName}, ${i.remarks || ""}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 8. Seed Audit Logs
    console.log(`Inserting ${db.audit.length} Audit Logs...`);
    for (const a of db.audit) {
      await sql`
        INSERT INTO "audit_logs" (
          id, audit_code, ts, user_id, user_name, role, action, detail, entity, entity_type, entity_id
        ) VALUES (
          ${toUUID(a.id)}, ${a.id}, ${a.ts}, ${a.userId ? toUUID(a.userId) : null}, ${a.userName}, ${a.role}, ${a.action}, ${a.detail || ""}, ${a.entity || ""}, ${a.entity || ""}, ${a.entity || ""}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 9. Save App State Snapshot in Neon Database
    console.log("Saving full database JSON snapshot into Neon app_state table...");
    await sql`
      INSERT INTO "app_state" (key, value, updated_at)
      VALUES ('full_store', ${JSON.stringify(db)}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();
    `;

    console.log("🎉 SUCCESS: Full Neon Database populated with UUID Primary Keys & Candidate Keys!");
  } catch (err) {
    console.error("❌ Error seeding full database:", err);
    process.exit(1);
  }
}

seedFullDatabase();
