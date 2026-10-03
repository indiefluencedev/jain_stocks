# MANDATORY AGENT RULE: Task & Improvement Logging System

All AI agents working on this repository MUST strictly follow the task logging protocol managed inside `.agent/tasks/`.

## Core Files & Responsibilities

1. **`tasks.md` (`.agent/tasks/tasks.md`)** — **SINGLE SOURCE OF TRUTH (SSOT)**
   - Serves as the authoritative log for all **Accomplished Tasks (`[x]`)** and **Pending Tasks (`[ ]`)**.
   - For EVERY task logged, the entry MUST contain:
     - **Task Title & ID/Timestamp**
     - **Reason / Situation** (Why the task was requested or initiated)
     - **Status** (`[x]` Accomplished / `[ ]` Pending)
     - **Files Involved & Specific Changes Made** (List of file paths and exact modifications made to each file)
     - **Pending Improvement Items** (Any pending tasks derived from `improvment_task.md`)

2. **`improvment_task.md` (`.agent/tasks/improvment_task.md`)**
   - Serves as the repository for **Improvement Suggestions**, **Code Audits**, **Refactoring Ideas**, and **Future Scope of Work**.
   - Tracks audit items and recommendations with status checkboxes (`[x]` Resolved / `[ ]` Proposed/Pending).
   - Any pending improvement that is queued for execution MUST be cross-referenced and logged in `tasks.md` under **Pending Tasks**.

---

## Workflow Protocol for Agents
At the start of a session:
1. Inspect `.agent/tasks/tasks.md` to understand accomplished work and current pending tasks.
2. Inspect `.agent/tasks/improvment_task.md` to review past audits and future suggestions.

Before completing any task or ending a session:
1. Update `.agent/tasks/tasks.md` with:
   - Newly accomplished tasks (`[x]`) with clear reasons and complete file change logs.
   - Any new or updated pending tasks (`[ ]`).
2. Update `.agent/tasks/improvment_task.md` with:
   - Architectural improvements identified.
   - Technical debt or future scope recommendations.
3. Verify that `tasks.md` accurately reflects all pending items from `improvment_task.md`.
