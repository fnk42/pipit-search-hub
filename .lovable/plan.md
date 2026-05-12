## Changes

### 1. Remove top horizontal scrollbar — Companies (PE Firms) table
In `src/components/pe-firms/PeFirmsTable.tsx`:
- Delete the mirrored top scrollbar `<div ref={topRef}>` element rendered above the table.
- Remove `topRef`, `bottomRef`, `innerRef`, `syncing` refs and the `useEffect` + `ResizeObserver` that synced widths.
- Remove the `onScroll` sync handler on the bottom scroll container.
- Keep the table's own bottom horizontal scroll (`overflow-x-auto`) intact.

### 2. (Carry over pending items from previous plan, still not yet implemented)
- Pagination for Companies (25/50/100 per page) in `src/routes/_authenticated/pe-firms.tsx`.
- Compact candidate rows + resizable columns in `src/components/candidates/CandidatesTable.tsx`.

If you only want the scrollbar removal this round, say so and I'll skip #2.

No backend, schema, or business-logic changes.
