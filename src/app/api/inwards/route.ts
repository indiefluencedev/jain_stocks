/**
 * @file src/app/api/inwards/route.ts
 * @description Next.js API Route Handler for Server-Side Paginated GRN Stock Inward Invoices.
 * 
 * Supports B-Tree indexed search by GRN entry number, supplier invoice number, supplier name, and SQL pagination.
 * 
 * @module ApiInwardsRoute
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
        i.id,
        i.no,
        i.ts::bigint AS ts,
        i.invoice_no AS "invoiceNo",
        i.invoice_date AS "invoiceDate",
        i.supplier,
        i.lines,
        i.user_id AS "userId",
        i.user_name AS "userName",
        i.remarks,
        COUNT(*) OVER()::int AS total_count
      FROM "inwards" i
      WHERE (${searchPattern}::text IS NULL OR i.no ILIKE ${searchPattern} OR i.invoice_no ILIKE ${searchPattern} OR i.supplier ILIKE ${searchPattern})
      ORDER BY 
        CASE WHEN ${sortOrder === 'asc'} THEN i.ts END ASC,
        i.ts DESC
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
    console.error('Error fetching paginated stock inwards:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
