---
name: improvement-audit-and-future-scope
description: Architectural improvements, audit findings, and future scope of tasks.
metadata:
  type: user
---

# 🚀 Improvement Audit & Future Scope

This file tracks **Improvement Suggestions**, **Audit Findings**, and **Future Scope Recommendations**. Pending items in this log are cross-posted to `.agent/tasks/tasks.md` as the Single Source of Truth.

---

## 🔍 Audit & Improvement Findings

### 1. Authentication & Security Overhaul
- **Situation**: The application previously used a custom local password hashing scheme (`hashPw`/`sha256`) and stored session state in `sessionStorage`.
- **Status**: `[x]` Resolved
- **Improvements Implemented**:
  - Centralized authentication with `better-auth` (JWT tokens, secure PBKDF2/bcrypt hashing).
  - Centralized RBAC enforcement in `ops.ts` (`hasPerm`) and React UI hook (`can()`).
  - Removed obsolete password fields (`salt`, `hash`) from `User` entity types.

### 2. Codebase Documentation & Architecture Transparency
- **Situation**: Whole codebase lacked JSDoc comments, making data flow and dynamic stock equations hard to trace.
- **Status**: `[x]` Resolved
- **Improvements Implemented**:
  - Added comprehensive JSDoc and SDE comments to 100% of files in `src/`.
  - Documented Dynamic Live Stock Equation ($\text{Stock}(P, T)$) and Destination Holding Equation ($\text{Holding}(D, P)$).
  - Authored full 9-role tour document at `docs/06_ROLE_BASED_UI_AND_AUTHORITY_TOUR.md`.

---

## 🔮 Future Scope & Suggested Tasks

### 1. Database-Driven Reference Data (Models & Adjust Reasons)
- **Status**: `[ ]` Proposed / Pending
- **Description**: Move hardcoded arrays (`MODELS`, `ADJ_REASONS`) from `constants.ts` to Neon DB database tables.
- **Benefits**: Allows adding new bike models (e.g. new Royal Enfield launches) or custom adjustment reasons dynamically without code redeployment.
- **Action Items**:
  - Run database migration script `scripts/seed-static-data.ts`.
  - Expose API endpoints `listBikeModels` and `listAdjustReasons`.
  - Update UI dropdowns to fetch reference data at runtime.
  - *Logged in `tasks.md` as Pending Task 1 & 2.*

### 2. Dead File Cleanup & Dependency Trimming
- **Status**: `[ ]` Proposed / Pending
- **Description**: Remove unreferenced dead files identified in Ponytail audit (`jain-stock-mvp_1.html`, `scripts/seed-users.ts`, `scripts/seed-full-db.ts`, `src/lib/auth-rbac.ts`, `src/lib/auth-client.ts`, `middleware.ts`, `neon.ts`).
- **Benefits**: Reduces repository line count by 2300+ lines and eliminates unused dependencies.
- **Action Items**:
  - Verify zero references across repo.
  - Delete dead files and trim package dependencies.
  - *Logged in `tasks.md` as Pending Task 4.*

### 3. Native Web Crypto Optimization
- **Status**: `[ ]` Proposed / Pending
- **Description**: Replace hand-rolled `sha256()` and `generateUUID()` fallbacks in `store.ts` with standard `crypto.randomUUID()` and native Web Crypto APIs.
- **Benefits**: Improved performance, cleaner code, and elimination of custom crypto primitives.
- **Action Items**:
  - Refactor `store.ts` helper functions to use `crypto.randomUUID()`.
  - *Logged in `tasks.md` as Pending Task 3.*

---

## 🔄 Cross-Reference Checklist
- [x] All pending future scope items (Tasks 1-4) are logged in `.agent/tasks/tasks.md`.
- [x] Rule `.agents/rules/task_logging.md` active for all future agent interactions.
