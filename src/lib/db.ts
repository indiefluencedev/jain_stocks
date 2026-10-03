/**
 * @file src/lib/db.ts
 * @description Serverless Neon PostgreSQL Client & SQL Query Runner Helper.
 * 
 * Provides unified database access for Next.js App Router Server Components,
 * Server Actions, and REST API Route Handlers with connection caching.
 * Also defines standard server-side pagination contracts and query utilities.
 * 
 * @module LibDb
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL || process.env.NEXT_NEON_DB_URI;

if (!databaseUrl && typeof window === "undefined") {
  console.warn("⚠️ DATABASE_URL is missing in environment.");
}

/**
 * Global cached Neon SQL query function instance.
 */
let cachedSql: NeonQueryFunction<false, false> | null = null;

/**
 * Returns the cached serverless Neon SQL query runner instance.
 */
export function getDb(): NeonQueryFunction<false, false> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or NEXT_NEON_DB_URI environment variable is not configured.");
  }
  if (!cachedSql) {
    cachedSql = neon(databaseUrl);
  }
  return cachedSql;
}

/**
 * Standard Server-Side Pagination Request Parameters.
 */
export interface PaginatedQueryParams {
  page?: number;        // 1-indexed page number (default: 1)
  pageSize?: number;    // Rows per page (default: 25, max: 100)
  search?: string;     // Generic search term
  category?: string;   // Category filter
  status?: string;     // Status filter
  type?: string;       // Movement type filter
  sortBy?: string;     // Column to sort by
  sortOrder?: 'asc' | 'desc';
}

/**
 * Parsed Server-Side Pagination Parameters with Default Guarantees.
 */
export interface ParsedPaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Standard Server-Side Pagination Response Format.
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Helper utility to parse pagination search parameters from URL Request.
 */
export function parsePaginationParams(reqUrl: string): ParsedPaginationParams {
  const { searchParams } = new URL(reqUrl);
  
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawPageSize = parseInt(searchParams.get("pageSize") || "25", 10);
  
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const pageSize = isNaN(rawPageSize) || rawPageSize < 1 ? 25 : Math.min(rawPageSize, 100);
  
  return {
    page,
    pageSize,
    search: searchParams.get("search") || undefined,
    category: searchParams.get("category") || undefined,
    status: searchParams.get("status") || undefined,
    type: searchParams.get("type") || undefined,
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder")?.toLowerCase() as 'asc' | 'desc') || 'desc',
  };
}
