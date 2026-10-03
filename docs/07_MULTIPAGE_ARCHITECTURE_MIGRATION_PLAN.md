/**
 * @file docs/07_MULTIPAGE_ARCHITECTURE_MIGRATION_PLAN.md
 * @description Master Specification and Phased Implementation Plan for Migrating Jain Automobiles Stock MVP
 * from a Single-Page App (SPA JSON snapshot) to a Multi-Page Next.js App Router Architecture
 * backed by a Relational PostgreSQL Database with Server-Side SQL Pagination and Indexing.
 */

# 🏗️ Multi-Page Architecture & Relational PostgreSQL Migration Plan

## 1. Executive Summary & Migration Objectives

The Jain Automobiles Stock MVP is transitioning from a **Single-Page Application (SPA) JSON-snapshot architecture** (`app_state` table containing a single `full_store` JSON document) to a **Multi-Page Next.js App Router Architecture** powered by a **pure relational PostgreSQL database** (Neon DB).

### Key Objectives
1. **Eliminate Database Write Bloat & Race Conditions**: Remove the single-document `app_state` update bottleneck (`UPDATE app_state SET value = ...`).
2. **Server-Side SQL Pagination & Filtering**: Offload filtering, sorting, and pagination for 100,000+ records to the PostgreSQL query engine using B-Tree indexes.
3. **App Router Layouts & Deep Linking**: Convert hash-based routes (`#inventory`, `#requests`) into clean RESTful URLs (`/inventory`, `/requests/REQ-2026-0001`, `/challans/DC-2026-0005`).
4. **Server Component (RSC) Security & Speed**: Execute database queries securely on the Node server, delivering server-rendered HTML and minimal client JavaScript payload sizes (~15 KB per page vs 20 MB JSON payload).
5. **ACID Transaction Isolation**: Enforce multi-row relational transactions for inventory stock movements (Requests $\rightarrow$ Challans $\rightarrow$ Stock Ledger).

---

## 2. Relational PostgreSQL Schema & Indexing Architecture

### 2.1 Database Entity Relationship (ER) Model

All tables maintain strict Foreign Key constraints and B-Tree indexes:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     "user"      │       │     "parts"     │       │ "destinations"  │
│  (Auth & Role)  │       │  (Item Catalog) │       │(Location/Bikes) │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │ 1:N                     │ 1:N                     │ 1:N
         ▼                         ▼                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                            "stock_ledger"                            │
│           (Append-Only Dynamic Double-Entry Movement Journal)        │
└──────────────────────────────────────────────────────────────────────┘
         ▲                         ▲                         ▲
         │ 1:N                     │ 1:N                     │ 1:N
┌────────┴────────┐       ┌────────┴────────┐       ┌────────┴────────┐
│   "requests"    │       │   "challans"    │       │    "inwards"    │
│(Indent Vouchers)│       │(Issue Vouchers) │       │ (GRN Invoices)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 2.2 Table Definitions & Optimization Indexes

#### A. Stock Ledger Table (`stock_ledger`) — Immutable Journal
```sql
CREATE TABLE IF NOT EXISTS "stock_ledger" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL, -- 'OPENING' | 'IN' | 'ISSUE' | 'RETURN' | 'ADJUST'
  part_id UUID NOT NULL REFERENCES "parts"(id) ON DELETE RESTRICT,
  part_code VARCHAR(64) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  qty INT NOT NULL, -- Positive for IN/OPENING/RETURN, Negative for ISSUE
  before_qty INT NOT NULL,
  after_qty INT NOT NULL,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  user_name VARCHAR(128) NOT NULL,
  user_role VARCHAR(64) NOT NULL,
  destination_id UUID REFERENCES "destinations"(id) ON DELETE RESTRICT,
  destination_name VARCHAR(255),
  chassis VARCHAR(64),
  model VARCHAR(128),
  sales_invoice VARCHAR(64),
  supplier_invoice VARCHAR(64),
  grn_no VARCHAR(64),
  challan_no VARCHAR(64),
  request_no VARCHAR(64),
  requested_by VARCHAR(128),
  issued_by VARCHAR(128),
  return_no VARCHAR(64),
  adjust_no VARCHAR(64),
  reason TEXT,
  remarks TEXT,
  reverses_id UUID REFERENCES "stock_ledger"(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance B-Tree Indexes for Dynamic Stock Equations
CREATE INDEX IF NOT EXISTS idx_ledger_part_id ON "stock_ledger"(part_id);
CREATE INDEX IF NOT EXISTS idx_ledger_destination_id ON "stock_ledger"(destination_id);
CREATE INDEX IF NOT EXISTS idx_ledger_ts ON "stock_ledger"(ts DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON "stock_ledger"(type);
CREATE INDEX IF NOT EXISTS idx_ledger_challan_no ON "stock_ledger"(challan_no);
CREATE INDEX IF NOT EXISTS idx_ledger_request_no ON "stock_ledger"(request_no);
```

#### B. Stock Requests Table (`requests`) & Line Items
```sql
CREATE TABLE IF NOT EXISTS "requests" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR(64) UNIQUE NOT NULL,
  ts BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL, -- 'Requested' | 'Approved' | 'Issued' | 'Partially issued' | 'Rejected' | 'Cancelled'
  destination_id UUID NOT NULL REFERENCES "destinations"(id),
  destination_name VARCHAR(255) NOT NULL,
  dest_type VARCHAR(64) NOT NULL,
  chassis VARCHAR(64),
  model VARCHAR(128),
  sales_invoice VARCHAR(64),
  customer VARCHAR(255),
  items JSONB NOT NULL, -- Array of { partId, partCode, partName, qty, issued }
  remarks TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  challans JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_by_id UUID NOT NULL REFERENCES "user"(id),
  requested_by_name VARCHAR(128) NOT NULL,
  created_by_id UUID NOT NULL REFERENCES "user"(id),
  created_by_name VARCHAR(128) NOT NULL,
  approved_by_name VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON "requests"(status);
CREATE INDEX IF NOT EXISTS idx_requests_requested_by ON "requests"(requested_by_id);
CREATE INDEX IF NOT EXISTS idx_requests_ts ON "requests"(ts DESC);
```

---

## 3. Server-Side SQL Pagination & Query Engine

### 3.1 Standard Pagination Request/Response Contract

Every paginated API route handler supports the uniform pagination contract:

```typescript
export interface PaginatedRequest {
  page: number;        // 1-indexed page number (default: 1)
  pageSize: number;    // Rows per page (default: 25, max: 100)
  search?: string;     // Generic search filter across text columns
  category?: string;   // Category filter (e.g. Helmets, Protection)
  status?: string;     // Status filter (e.g. Requested, Issued)
  sortBy?: string;     // Column to sort by (e.g. ts, partCode, name)
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
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
```

### 3.2 SQL Server-Side Pagination & Aggregation Patterns

#### Pattern A: Single-Pass SQL Query with `COUNT(*) OVER()` Window Function
```sql
SELECT 
  id, part_code, name, category, model, uom, rack, purchase_price, selling_price, gst, min_qty, max_qty, active,
  COUNT(*) OVER() AS total_count
FROM "parts"
WHERE active = true
  AND (${search}::text IS NULL OR name ILIKE '%' || ${search} || '%' OR part_code ILIKE '%' || ${search} || '%')
  AND (${category}::text IS NULL OR category = ${category})
ORDER BY part_code ASC
LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};
```

#### Pattern B: Live Dynamic Stock Level SQL Query (No Static Stock Column)
```sql
SELECT 
  p.id, p.part_code, p.name, p.category, p.min_qty, p.max_qty,
  COALESCE(SUM(l.qty), 0) AS live_stock
FROM "parts" p
LEFT JOIN "stock_ledger" l ON l.part_id = p.id
WHERE p.active = true
GROUP BY p.id, p.part_code, p.name, p.category, p.min_qty, p.max_qty
ORDER BY live_stock ASC
LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize};
```

---

## 4. Next.js App Router Multi-Page Route Structure

The single-page SPA shell (`src/app/page.tsx`) will be refactored into modular Server Component page routes under `src/app/(dashboard)/`:

```
src/app/
├── (auth)/
│   └── login/
│       └── page.tsx                     --> /login (Server-rendered login page)
├── (dashboard)/
│   ├── layout.tsx                       --> Dashboard Shell Layout (Sidebar, Topbar, User Session)
│   ├── dashboard/
│   │   └── page.tsx                     --> /dashboard (Live Metrics & Recent Activity)
│   ├── inventory/
│   │   ├── page.tsx                     --> /inventory (Paginated Parts Catalog & Stock Levels)
│   │   └── [id]/
│   │       └── page.tsx                 --> /inventory/[id] (Part Details & Stock Movement History)
│   ├── requests/
│   │   ├── page.tsx                     --> /requests (Paginated Stock Indent Requests)
│   │   └── [id]/
│   │       └── page.tsx                 --> /requests/[id] (Request Details & Issue Action)
│   ├── challans/
│   │   ├── page.tsx                     --> /challans (Paginated Delivery Challans)
│   │   └── [id]/
│   │       └── page.tsx                 --> /challans/[id] (Printable Delivery Challan)
│   ├── inwards/
│   │   └── page.tsx                     --> /inwards (Paginated GRN Stock Inward Invoices)
│   ├── ledger/
│   │   └── page.tsx                     --> /ledger (Paginated Master Stock Journal)
│   ├── destinations/
│   │   └── page.tsx                     --> /destinations (Holding Balance Equation per Destination)
│   ├── users/
│   │   └── page.tsx                     --> /users (RBAC User Management)
│   ├── reports/
│   │   └── page.tsx                     --> /reports (Stock Valuation & Movement Analytics)
│   ├── audit/
│   │   └── page.tsx                     --> /audit (System Audit Logs)
│   └── settings/
│       └── page.tsx                     --> /settings (System Preferences & Data Export)
└── api/                                 --> RESTful API Route Handlers
    ├── inventory/route.ts               --> GET /api/inventory, POST /api/inventory
    ├── requests/route.ts                --> GET /api/requests, POST /api/requests
    ├── challans/route.ts                --> GET /api/challans
    ├── inwards/route.ts                 --> GET /api/inwards, POST /api/inwards
    ├── ledger/route.ts                  --> GET /api/ledger
    ├── destinations/route.ts            --> GET /api/destinations
    ├── users/route.ts                   --> GET /api/users
    └── reports/route.ts                 --> GET /api/reports
```

---

## 5. Phased Implementation Roadmap & Priorities

This migration is broken down into 5 atomic, prioritized phases. **Phase 1 and Phase 2 are Top Priority.**

### 🚨 Phase 1 (TOP PRIORITY): Database Schema Hardening & B-Tree Indexes
* **Task 1.1**: Run SQL DDL migrations to ensure `parts`, `destinations`, `stock_ledger`, `requests`, `challans`, `inwards`, `audit_logs` have foreign keys and B-Tree indexes.
* **Task 1.2**: Write Neon DB connection pool optimizer with `@neondatabase/serverless` using `pg.Pool` or HTTP `neon()` query runner.

### 🚨 Phase 2 (TOP PRIORITY): Server-Side Paginated API Route Handlers
* **Task 2.1**: Implement `GET /api/inventory` with SQL search, category filtering, and `LIMIT`/`OFFSET` pagination.
* **Task 2.2**: Implement `GET /api/requests` with status filtering (`Requested`, `Issued`, `Approved`) and SQL pagination.
* **Task 2.3**: Implement `GET /api/ledger` with SQL pagination and filtering by `part_id`, `type`, and date range.
* **Task 2.4**: Implement `GET /api/challans`, `GET /api/inwards`, and `GET /api/audit` paginated endpoints.

### Phase 3: Next.js App Router Folder Structure & Auth Middleware Guard
* **Task 3.1**: Create `src/app/(dashboard)/layout.tsx` shell preserving Topbar, Sidebar, and session user state.
* **Task 3.2**: Configure `src/middleware.ts` to enforce `better-auth` session token verification on protected dashboard routes.

### Phase 4: Server Component Page Conversion & Client Interactivity
* **Task 4.1**: Convert `/dashboard` to Server Component fetching live aggregate counts directly from Neon DB.
* **Task 4.2**: Convert `/inventory`, `/requests`, `/challans`, `/inwards`, `/ledger`, `/destinations`, `/users` to paginated tables.
* **Task 4.3**: Integrate Client Interactivity for Modals (Create Request, Issue Challan, Stock Inward) using Server Actions or API POST handlers.

### Phase 5: Complete Retirement of `app_state` & End-to-End Performance Verification
* **Task 5.1**: Remove legacy `app_state` JSON POST sync from `/api/db/route.ts` and `src/lib/store.ts`.
* **Task 5.2**: Run load testing to verify sub-50ms query response times under high concurrency.

---

## 6. Verification & Definition of Done

1. **Zero JSON Overwrite**: `app_state` table is fully retired; all data reads and writes target relational tables directly.
2. **Sub-100ms Page Loads**: All page routes (`/inventory`, `/requests`, `/ledger`) load initial HTML and paginated data in under 100 milliseconds.
3. **URL Bookmarkability**: Deep links like `/requests?page=2&status=Requested` work seamlessly across browser refreshes.
4. **Clean Build**: `npx tsc --noEmit` and `npm run build` pass with zero errors.
