/**
 * @file src/app/api/inventory/route.ts
 * @description Next.js API Route Handler for Server-Side Paginated Parts Catalog & Live Stock Levels.
 * 
 * Supports B-Tree indexed search (ILIKE), category filtering, dynamic live stock
 * calculation from stock_ledger, and server-side SQL pagination.
 * 
 * @module ApiInventoryRoute
 */

import { NextResponse } from 'next/server';
import { getDb, parsePaginationParams } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { page, pageSize, search, category, sortBy, sortOrder } = parsePaginationParams(req.url);
    const sql = getDb();

    const offset = (page - 1) * pageSize;
    const searchPattern = search ? `%${search}%` : null;

    // Single-pass query using SQL Window Function COUNT(*) OVER() and dynamic live stock SUM
    const rows = await sql`
      SELECT 
        p.id,
        p.part_code AS "partCode",
        p.part_number AS "partNumber",
        p.sku,
        p.name,
        p.category,
        p.model,
        p.uom,
        p.rack,
        p.purchase_price AS "purchasePrice",
        p.selling_price AS "sellingPrice",
        p.gst,
        p.min_qty AS "minQty",
        p.max_qty AS "maxQty",
        p.barcode,
        p.description,
        p.active,
        COALESCE(SUM(l.qty), 0)::int AS stock,
        COUNT(*) OVER()::int AS total_count
      FROM "parts" p
      LEFT JOIN "stock_ledger" l ON l.part_id = p.id
      WHERE (${searchPattern}::text IS NULL OR p.name ILIKE ${searchPattern} OR p.part_code ILIKE ${searchPattern})
        AND (${category || null}::text IS NULL OR p.category = ${category || null})
      GROUP BY p.id, p.part_code, p.part_number, p.sku, p.name, p.category, p.model, p.uom, p.rack, p.purchase_price, p.selling_price, p.gst, p.min_qty, p.max_qty, p.barcode, p.description, p.active
      ORDER BY 
        CASE WHEN ${sortBy === 'partCode' && sortOrder === 'asc'} THEN p.part_code END ASC,
        CASE WHEN ${sortBy === 'partCode' && sortOrder === 'desc'} THEN p.part_code END DESC,
        CASE WHEN ${sortBy === 'name' && sortOrder === 'asc'} THEN p.name END ASC,
        CASE WHEN ${sortBy === 'name' && sortOrder === 'desc'} THEN p.name END DESC,
        p.part_code ASC
      LIMIT ${pageSize} OFFSET ${offset};
    `;

    const totalRecords = rows.length > 0 ? rows[0].total_count : 0;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const data = rows.map(({ total_count, ...item }) => item);

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching paginated inventory:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
