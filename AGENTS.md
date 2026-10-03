<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Mandatory Task & Improvement Logging Rule

All agents MUST follow the task logging system in `.agent/tasks/`:
- **`.agent/tasks/tasks.md`**: Single Source of Truth (SSOT) for all accomplished (`[x]`) and pending (`[ ]`) tasks. Each task entry MUST state the reason, status, files involved, and exact file changes.
- **`.agent/tasks/improvment_task.md`**: Log of improvement suggestions, audits, and future scope. Pending items here MUST be cross-logged in `tasks.md`.
