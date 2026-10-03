/**
 * @file src/app/api/requests/route.ts
 * @description Next.js API Route Handler for Server-Side Paginated Stock Indent Requests.
 * 
 * Supports B-Tree indexed status filtering, requester filtering, search, and SQL pagination.
 * 
 * @module ApiRequestsRoute
 */

import { NextResponse } from 'next/server';
import { getDb, parsePaginationParams } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { page, pageSize, search, status, sortOrder } = parsePaginationParams(req.url);
    const sql = getDb();

    const offset = (page - 1) * pageSize;
    const searchPattern = search ? `%${search}%` : null;

    const rows = await sql`
      SELECT 
        r.id,
        r.no,
        r.ts::bigint AS ts,
        r.status,
        r.destination_id AS "destinationId",
        r.destination_name AS "destinationName",
        r.dest_type AS "destType",
        r.chassis,
        r.model,
        r.sales_invoice AS "salesInvoice",
        r.customer,
        r.items,
        r.remarks,
        r.history,
        r.challans,
        r.requested_by_id AS "requestedById",
        r.requested_by_name AS "requestedByName",
        r.created_by_id AS "createdById",
        r.created_by_name AS "createdByName",
        r.approved_by_name AS "approvedByName",
        r.created_at AS "createdAt",
        COUNT(*) OVER()::int AS total_count
      FROM "requests" r
      WHERE (${searchPattern}::text IS NULL OR r.no ILIKE ${searchPattern} OR r.destination_name ILIKE ${searchPattern} OR r.requested_by_name ILIKE ${searchPattern})
        AND (${status || null}::text IS NULL OR r.status = ${status || null})
      ORDER BY 
        CASE WHEN ${sortOrder === 'asc'} THEN r.ts END ASC,
        r.ts DESC
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
    console.error('Error fetching paginated requests:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
