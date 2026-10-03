/**
 * @file src/app/api/ledger/route.ts
 * @description Next.js API Route Handler for Server-Side Paginated Master Stock Journal (Ledger).
 * 
 * Supports B-Tree indexed filtering by movement type, part, destination, user, and date range.
 * 
 * @module ApiLedgerRoute
 */

import { NextResponse } from 'next/server';
import { getDb, parsePaginationParams } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { page, pageSize, search, type, sortOrder } = parsePaginationParams(req.url);
    const { searchParams } = new URL(req.url);
    const partId = searchParams.get("partId") || null;
    const destinationId = searchParams.get("destinationId") || null;

    const sql = getDb();
    const offset = (page - 1) * pageSize;
    const searchPattern = search ? `%${search}%` : null;

    const rows = await sql`
      SELECT 
        l.id,
        l.entry_code AS "entryCode",
        l.ts::bigint AS ts,
        l.type,
        l.part_id AS "partId",
        l.part_code AS "partCode",
        l.part_name AS "partName",
        l.qty,
        l.before,
        l.after,
        l.user_id AS "userId",
        l.user_name AS "userName",
        l.user_role AS "userRole",
        l.destination_id AS "destinationId",
        l.destination_name AS "destinationName",
        l.chassis,
        l.model,
        l.sales_invoice AS "salesInvoice",
        l.supplier_invoice AS "supplierInvoice",
        l.grn_no AS "grnNo",
        l.challan_no AS "challanNo",
        l.request_no AS "requestNo",
        l.requested_by AS "requestedBy",
        l.issued_by AS "issuedBy",
        l.return_no AS "returnNo",
        l.adjust_no AS "adjustNo",
        l.reason,
        l.remarks,
        l.reverses_id AS "reversesId",
        COUNT(*) OVER()::int AS total_count
      FROM "stock_ledger" l
      WHERE (${searchPattern}::text IS NULL OR l.part_code ILIKE ${searchPattern} OR l.part_name ILIKE ${searchPattern} OR l.challan_no ILIKE ${searchPattern} OR l.request_no ILIKE ${searchPattern})
        AND (${type || null}::text IS NULL OR l.type = ${type || null})
        AND (${partId}::uuid IS NULL OR l.part_id = ${partId}::uuid)
        AND (${destinationId}::uuid IS NULL OR l.destination_id = ${destinationId}::uuid)
      ORDER BY 
        CASE WHEN ${sortOrder === 'asc'} THEN l.ts END ASC,
        l.ts DESC
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
    console.error('Error fetching paginated stock ledger:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
