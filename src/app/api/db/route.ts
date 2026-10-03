import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_NEON_DB_URI;

export async function GET() {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL is missing' }, { status: 500 });
  }

  try {
    const sql = neon(databaseUrl);
    const rows = await sql`SELECT value FROM app_state WHERE key = 'full_store'`;
    if (rows && rows.length > 0) {
      return NextResponse.json({ db: rows[0].value });
    }
    return NextResponse.json({ db: null });
  } catch (error: any) {
    console.error('Error fetching app_state from Neon DB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL is missing' }, { status: 500 });
  }

  try {
    const { db } = await req.json();
    if (!db) {
      return NextResponse.json({ error: 'Missing db payload' }, { status: 400 });
    }

    const sql = neon(databaseUrl);

    // 1. Persist full snapshot in app_state table
    await sql`
      INSERT INTO app_state (key, value, updated_at)
      VALUES ('full_store', ${JSON.stringify(db)}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `;

    // 2. Sync parts relationally
    if (db.parts && Array.isArray(db.parts)) {
      for (const p of db.parts) {
        await sql`
          INSERT INTO "parts" (
            id, part_code, part_number, sku, name, category, model, uom, rack,
            purchase_price, selling_price, gst, min_qty, max_qty, barcode, description, active
          ) VALUES (
            ${p.id}, ${p.partCode}, ${p.partCode}, ${p.sku || ''}, ${p.name}, ${p.category}, ${p.model || 'Universal'}, ${p.uom || 'Nos'}, ${p.rack || ''},
            ${p.purchasePrice || 0}, ${p.sellingPrice || 0}, ${p.gst || 18}, ${p.minQty || 0}, ${p.maxQty || 0}, ${p.barcode || ''}, ${p.description || ''}, ${p.active ?? true}
          )
          ON CONFLICT (id) DO UPDATE SET
            part_code = EXCLUDED.part_code,
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            purchase_price = EXCLUDED.purchase_price,
            selling_price = EXCLUDED.selling_price,
            active = EXCLUDED.active;
        `.catch((err) => console.error('Parts sync sub-error:', err));
      }
    }

    // 3. Sync destinations relationally
    if (db.destinations && Array.isArray(db.destinations)) {
      for (const d of db.destinations) {
        await sql`
          INSERT INTO "destinations" (id, code, name, type, note, active)
          VALUES (${d.id}, ${d.code || d.id}, ${d.name}, ${d.type}, ${d.note || ''}, ${d.active ?? true})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            note = EXCLUDED.note,
            active = EXCLUDED.active;
        `.catch((err) => console.error('Destinations sync sub-error:', err));
      }
    }

    // 4. Sync users relationally
    if (db.users && Array.isArray(db.users)) {
      for (const u of db.users) {
        const email = u.username + "@jainstock.com";
        await sql`
          INSERT INTO "user" (id, user_code, name, email, "emailVerified", role, username, phone, status, salt, hash, "createdAt", "lastLogin")
          VALUES (
            ${u.id}, ${u.code || u.username}, ${u.name}, ${email}, true, ${u.role}, ${u.username},
            ${u.phone || ''}, ${u.active ? 'active' : 'inactive'}, ${u.salt}, ${u.hash},
            ${new Date(u.createdAt || Date.now()).toISOString()},
            ${u.lastLogin ? new Date(u.lastLogin).toISOString() : null}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            salt = EXCLUDED.salt,
            hash = EXCLUDED.hash;
        `.catch((err) => console.error('User sync sub-error:', err));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error saving app_state to Neon DB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
