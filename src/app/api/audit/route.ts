/**
 * @file src/app/api/audit/route.ts
 * @description Next.js API Route Handler for Server-Side Paginated System Audit Logs.
 * 
 * Supports B-Tree indexed search by user name, action, detail, and SQL pagination.
 * 
 * @module ApiAuditRoute
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
        a.id,
        a.audit_code AS "auditCode",
        a.ts::bigint AS ts,
        a.user_id AS "userId",
        a.user_name AS "userName",
        a.role,
        a.action,
        a.detail,
        a.entity,
        a.entity_type AS "entityType",
        a.entity_id AS "entityId",
        a.created_at AS "createdAt",
        COUNT(*) OVER()::int AS total_count
      FROM "audit_logs" a
      WHERE (${searchPattern}::text IS NULL OR a.user_name ILIKE ${searchPattern} OR a.action ILIKE ${searchPattern} OR a.detail ILIKE ${searchPattern})
      ORDER BY 
        CASE WHEN ${sortOrder === 'asc'} THEN a.ts END ASC,
        a.ts DESC
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
    console.error('Error fetching paginated audit logs:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
