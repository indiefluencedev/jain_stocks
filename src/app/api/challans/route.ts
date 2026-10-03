/**
 * @file src/app/api/challans/route.ts
 * @description Next.js API Route Handler for Server-Side Paginated Delivery Challans.
 * 
 * Supports B-Tree indexed search by challan number, request number, destination, and SQL pagination.
 * 
 * @module ApiChallansRoute
 */

import { NextResponse } from 'next/server';
import { getDb, parsePaginationParams } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { page, pageSize, search, sortOrder } = parsePaginationParams(req.url);
    const sql = getDb();

    const offset = (page - 1) * pageSize;
    const searchPattern = search ? `%${search}%` : null;

    const rows = await sql`
      SELECT 
        c.id,
        c.no,
        c.ts::bigint AS ts,
        c.request_id AS "requestId",
        c.request_no AS "requestNo",
        c.destination_id AS "destinationId",
        c.destination_name AS "destinationName",
        c.dest_type AS "destType",
        c.chassis,
        c.model,
        c.sales_invoice AS "salesInvoice",
        c.customer,
        c.items,
        c.requested_by_name AS "requestedByName",
        c.issued_by_id AS "issuedById",
        c.issued_by_name AS "issuedByName",
        c.remarks,
        c.created_at AS "createdAt",
        COUNT(*) OVER()::int AS total_count
      FROM "challans" c
      WHERE (${searchPattern}::text IS NULL OR c.no ILIKE ${searchPattern} OR c.request_no ILIKE ${searchPattern} OR c.destination_name ILIKE ${searchPattern})
      ORDER BY 
        CASE WHEN ${sortOrder === 'asc'} THEN c.ts END ASC,
        c.ts DESC
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
    console.error('Error fetching paginated delivery challans:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
