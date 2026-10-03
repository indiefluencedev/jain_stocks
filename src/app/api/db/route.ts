/**
 * @file src/app/api/db/route.ts
 * @description Next.js Route Handler for Serverless Relational PostgreSQL Database Synchronization.
 * 
 * Provides GET & POST endpoints to synchronize application state directly with relational PostgreSQL tables:
 * - GET: Retrieves relational entities (`parts`, `destinations`, `requests`, `challans`, `inwards`, `stock_ledger`, `audit_logs`, `user`) directly from Neon DB.
 * - POST: Relationally syncs all transactional entities (`stock_ledger`, `requests`, `challans`, `inwards`, `audit_logs`, `parts`, `destinations`, `user`) directly into PostgreSQL.
 * 
 * @module ApiDbRoute
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { baseDB, toUUID } from '@/lib/store';

/**
 * GET Handler - Reads relational entities directly from Neon PostgreSQL.
 */
export async function GET() {
  try {
    const sql = getDb();

    const [parts, destinations, users, requests, challans, inwards, ledger, audit] = await Promise.all([
      sql`SELECT id, part_code AS "partCode", part_number AS "partNumber", sku, name, category, model, uom, rack, purchase_price AS "purchasePrice", selling_price AS "sellingPrice", gst, min_qty AS "minQty", max_qty AS "maxQty", barcode, description, active FROM "parts" ORDER BY part_code ASC`,
      sql`SELECT id, code, name, type, note, address, contact_person AS "contactPerson", phone, is_virtual AS "isVirtual", status, active FROM "destinations" ORDER BY name ASC`,
      sql`SELECT id, user_code AS code, name, email, role, username, phone, status = 'active' AS active FROM "user" ORDER BY name ASC`,
      sql`SELECT id, no, ts::bigint AS ts, status, destination_id AS "destinationId", destination_name AS "destinationName", dest_type AS "destType", chassis, model, sales_invoice AS "salesInvoice", customer, items, remarks, history, challans, requested_by_id AS "requestedById", requested_by_name AS "requestedByName", created_by_id AS "createdById", created_by_name AS "createdByName", approved_by_name AS "approvedByName" FROM "requests" ORDER BY ts DESC`,
      sql`SELECT id, no, ts::bigint AS ts, request_id AS "requestId", request_no AS "requestNo", destination_id AS "destinationId", destination_name AS "destinationName", dest_type AS "destType", chassis, model, sales_invoice AS "salesInvoice", customer, items, requested_by_name AS "requestedByName", issued_by_id AS "issuedById", issued_by_name AS "issuedByName", remarks FROM "challans" ORDER BY ts DESC`,
      sql`SELECT id, no, ts::bigint AS ts, invoice_no AS "invoiceNo", invoice_date AS "invoiceDate", supplier, lines, user_id AS "userId", user_name AS "userName", remarks FROM "inwards" ORDER BY ts DESC`,
      sql`SELECT id, entry_code AS "entryCode", ts::bigint AS ts, type, part_id AS "partId", part_code AS "partCode", part_name AS "partName", qty, before, after, user_id AS "userId", user_name AS "userName", user_role AS "userRole", destination_id AS "destinationId", destination_name AS "destinationName", chassis, model, sales_invoice AS "salesInvoice", supplier_invoice AS "supplierInvoice", grn_no AS "grnNo", challan_no AS "challanNo", request_no AS "requestNo", requested_by AS "requestedBy", issued_by AS "issuedBy", return_no AS "returnNo", adjust_no AS "adjustNo", reason, remarks, reverses_id AS "reversesId" FROM "stock_ledger" ORDER BY ts DESC`,
      sql`SELECT id, audit_code AS "auditCode", ts::bigint AS ts, user_id AS "userId", user_name AS "userName", role, action, detail, entity, entity_type AS "entityType", entity_id AS "entityId" FROM "audit_logs" ORDER BY ts DESC`,
    ]);

    const store = {
      ...baseDB(),
      parts: parts || [],
      destinations: destinations || [],
      users: users || [],
      requests: requests || [],
      challans: challans || [],
      inwards: inwards || [],
      ledger: ledger || [],
      audit: audit || [],
    };

    return NextResponse.json({ db: store });
  } catch (error: any) {
    console.error('Error reading relational DB from Neon:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST Handler - Synchronizes entity updates relationally in Neon DB.
 */
export async function POST(req: Request) {
  try {
    const { db } = await req.json();
    if (!db) {
      return NextResponse.json({ error: 'Missing db payload' }, { status: 400 });
    }

    const sql = getDb();

    // 1. Sync parts relationally
    if (db.parts && Array.isArray(db.parts)) {
      for (const p of db.parts) {
        const partUuid = toUUID(p.id);
        await sql`
          INSERT INTO "parts" (
            id, part_code, part_number, sku, name, category, model, uom, rack,
            purchase_price, selling_price, gst, min_qty, max_qty, barcode, description, active
          ) VALUES (
            ${partUuid}::uuid, ${p.partCode}, ${p.partCode}, ${p.sku || ''}, ${p.name}, ${p.category}, ${p.model || 'Universal'}, ${p.uom || 'Nos'}, ${p.rack || ''},
            ${p.purchasePrice || 0}, ${p.sellingPrice || 0}, ${p.gst || 18}, ${p.minQty || 0}, ${p.maxQty || 0}, ${p.barcode || ''}, ${p.description || ''}, ${p.active ?? true}
          )
          ON CONFLICT (id) DO UPDATE SET
            part_code = EXCLUDED.part_code,
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            purchase_price = EXCLUDED.purchase_price,
            selling_price = EXCLUDED.selling_price,
            active = EXCLUDED.active;
        `.catch((err) => console.error('Parts sync error:', err));
      }
    }

    // 2. Sync destinations relationally
    if (db.destinations && Array.isArray(db.destinations)) {
      for (const d of db.destinations) {
        const destUuid = toUUID(d.id);
        await sql`
          INSERT INTO "destinations" (id, code, name, type, note, active)
          VALUES (${destUuid}::uuid, ${d.code || d.id}, ${d.name}, ${d.type}, ${d.note || ''}, ${d.active ?? true})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            note = EXCLUDED.note,
            active = EXCLUDED.active;
        `.catch((err) => console.error('Destinations sync error:', err));
      }
    }

    // 3. Sync inwards (GRN Invoices) relationally
    if (db.inwards && Array.isArray(db.inwards)) {
      for (const inv of db.inwards) {
        const inwardUuid = toUUID(inv.id || inv.no);
        const userUuid = inv.userId ? toUUID(inv.userId) : null;
        await sql`
          INSERT INTO "inwards" (
            id, no, ts, invoice_no, invoice_date, supplier, lines, user_id, user_name, remarks
          ) VALUES (
            ${inwardUuid}::uuid, ${inv.no}, ${inv.ts || Date.now()}, ${inv.invoiceNo}, ${inv.invoiceDate || ''},
            ${inv.supplier || ''}, ${JSON.stringify(inv.lines || [])}::jsonb, ${userUuid ? userUuid + '::uuid' : null},
            ${inv.userName || 'Super Admin'}, ${inv.remarks || ''}
          )
          ON CONFLICT (id) DO UPDATE SET
            invoice_no = EXCLUDED.invoice_no,
            lines = EXCLUDED.lines,
            remarks = EXCLUDED.remarks;
        `.catch((err) => console.error('Inwards sync error:', err));
      }
    }

    // 4. Sync stock ledger entries relationally
    if (db.ledger && Array.isArray(db.ledger)) {
      for (const l of db.ledger) {
        const ledgerUuid = toUUID(l.id);
        const partUuid = toUUID(l.partId);
        const userUuid = l.userId ? toUUID(l.userId) : null;
        const destUuid = l.destinationId ? toUUID(l.destinationId) : null;
        const reversesUuid = l.reversesId ? toUUID(l.reversesId) : null;

        await sql`
          INSERT INTO "stock_ledger" (
            id, entry_code, ts, type, part_id, part_code, part_name, qty, before, after,
            user_id, user_name, user_role, destination_id, destination_name, chassis, model,
            sales_invoice, supplier_invoice, grn_no, challan_no, request_no, requested_by,
            issued_by, return_no, adjust_no, reason, remarks, reverses_id
          ) VALUES (
            ${ledgerUuid}::uuid, ${l.entryCode || l.id}, ${l.ts || Date.now()}, ${l.type}, ${partUuid}::uuid,
            ${l.partCode}, ${l.partName}, ${l.qty}, ${l.before || 0}, ${l.after || 0},
            ${userUuid ? userUuid + '::uuid' : null}, ${l.userName || 'System'}, ${l.userRole || ''},
            ${destUuid ? destUuid + '::uuid' : null}, ${l.destinationName || ''}, ${l.chassis || ''}, ${l.model || ''},
            ${l.salesInvoice || ''}, ${l.supplierInvoice || ''}, ${l.grnNo || ''}, ${l.challanNo || ''},
            ${l.requestNo || ''}, ${l.requestedBy || ''}, ${l.issuedBy || ''}, ${l.returnNo || ''},
            ${l.adjustNo || ''}, ${l.reason || ''}, ${l.remarks || ''}, ${reversesUuid ? reversesUuid + '::uuid' : null}
          )
          ON CONFLICT (id) DO NOTHING;
        `.catch((err) => console.error('Ledger sync error:', err));
      }
    }

    // 5. Sync stock requests relationally
    if (db.requests && Array.isArray(db.requests)) {
      for (const r of db.requests) {
        const reqUuid = toUUID(r.id);
        const destUuid = toUUID(r.destinationId);
        const reqByUuid = toUUID(r.requestedById);
        const createdByUuid = toUUID(r.createdById || r.requestedById);

        await sql`
          INSERT INTO "requests" (
            id, no, ts, status, destination_id, destination_name, dest_type, chassis, model,
            sales_invoice, customer, items, remarks, requested_by_id, requested_by_name,
            created_by_id, created_by_name, approved_by_name, history, challans
          ) VALUES (
            ${reqUuid}::uuid, ${r.no}, ${r.ts || Date.now()}, ${r.status}, ${destUuid}::uuid,
            ${r.destinationName}, ${r.destType || 'workshop_bay'}, ${r.chassis || ''}, ${r.model || 'Universal'},
            ${r.salesInvoice || ''}, ${r.customer || ''}, ${JSON.stringify(r.items || [])}::jsonb, ${r.remarks || ''},
            ${reqByUuid}::uuid, ${r.requestedByName}, ${createdByUuid}::uuid, ${r.createdByName || r.requestedByName},
            ${r.approvedByName || null}, ${JSON.stringify(r.history || [])}::jsonb, ${JSON.stringify(r.challans || [])}::jsonb
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            items = EXCLUDED.items,
            history = EXCLUDED.history,
            challans = EXCLUDED.challans,
            approved_by_name = EXCLUDED.approved_by_name;
        `.catch((err) => console.error('Requests sync error:', err));
      }
    }

    // 6. Sync delivery challans relationally
    if (db.challans && Array.isArray(db.challans)) {
      for (const c of db.challans) {
        const challanUuid = toUUID(c.id);
        const reqUuid = toUUID(c.requestId);
        const destUuid = toUUID(c.destinationId);
        const issuedByUuid = toUUID(c.issuedById);

        await sql`
          INSERT INTO "challans" (
            id, no, ts, request_id, request_no, destination_id, destination_name, dest_type,
            chassis, model, sales_invoice, customer, items, requested_by_name, issued_by_id,
            issued_by_name, remarks
          ) VALUES (
            ${challanUuid}::uuid, ${c.no}, ${c.ts || Date.now()}, ${reqUuid}::uuid, ${c.requestNo},
            ${destUuid}::uuid, ${c.destinationName}, ${c.destType || 'workshop_bay'}, ${c.chassis || ''},
            ${c.model || 'Universal'}, ${c.salesInvoice || ''}, ${c.customer || ''}, ${JSON.stringify(c.items || [])}::jsonb,
            ${c.requestedByName}, ${issuedByUuid}::uuid, ${c.issuedByName}, ${c.remarks || ''}
          )
          ON CONFLICT (id) DO UPDATE SET
            items = EXCLUDED.items,
            remarks = EXCLUDED.remarks;
        `.catch((err) => console.error('Challans sync error:', err));
      }
    }

    // 7. Sync audit logs relationally
    if (db.audit && Array.isArray(db.audit)) {
      for (const a of db.audit) {
        const auditUuid = toUUID(a.id);
        const userUuid = a.userId ? toUUID(a.userId) : null;
        await sql`
          INSERT INTO "audit_logs" (
            id, audit_code, ts, user_id, user_name, role, action, detail, entity, entity_type, entity_id
          ) VALUES (
            ${auditUuid}::uuid, ${a.auditCode || a.id}, ${a.ts || Date.now()}, ${userUuid ? userUuid + '::uuid' : null},
            ${a.userName || 'System'}, ${a.role || ''}, ${a.action}, ${a.detail || ''}, ${a.entity || ''},
            ${a.entityType || ''}, ${a.entityId || ''}
          )
          ON CONFLICT (id) DO NOTHING;
        `.catch((err) => console.error('Audit sync error:', err));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error saving relational state to Neon DB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
