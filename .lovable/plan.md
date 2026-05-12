## Decisions captured

1. **Non-Target-Fit candidates** stay at stage `Sourced` (no new stage). Pipeline metric uses `fit`, not stage, to filter them out.
2. **Pipeline metric** → show **two metrics** on the dashboard: Master (all non-placed) and Active pipeline (current definition).
3. **Rejected + Target Fit** → auto-downgrade `fit` to `Unassessed` when stage moves to any `Rejected by …` stage. Cleans the shortlist count.
4. **Days Active** → set search-start to **April 1, 2026**, and make it editable in Settings.
5. **Table layout** → drop the separate Title/Firm column; stack `title · firm` under the name on a second line. Fixes the sticky-column overlap.

---

## Changes

### A. Table layout — fix overlap (`src/components/candidates/CandidatesTable.tsx`)

- Remove the `Title / Firm` header and cell.
- Inside the Name cell, render two stacked lines:
  - **Line 1:** Name (single line, never wraps) + star + LinkedIn icon.
  - **Line 2:** `{title} · {firm}` in `text-xs text-muted-foreground`, truncated, with `title=` tooltip. Recruiters get the same `EditableText` controls inline.
- Widen Name column from `w-[180px]` → `w-[260px]`.
- Add a subtle right-edge shadow to the sticky Name cell so the boundary between pinned and scrolling content is obvious.
- Mobile cards already do this — no change there.

### B. Fit ↔ Stage sync (DB trigger, migration)

- Update `sync_fit_to_shortlisted` (or add a sibling trigger) so that **on UPDATE**, when `pipeline_stage` moves into any of the `Rejected by …` stages, `fit` is set to `'Unassessed'`. `shortlisted` already syncs from `fit`, so this also drops them off the shortlist.
- One-shot data fix in the same migration: for the ~68 rows where `fit = 'Target Fit'` AND `pipeline_stage` starts with `'Rejected by'`, set `fit = 'Unassessed'`.

### C. Dashboard — two metrics (`src/lib/dashboard.functions.ts`, `src/components/dashboard/Dashboard.tsx`)

- Compute and return **both**:
  - `masterTotal` = total candidates minus `Placed`.
  - `activePipeline` = current definition (everyone except `Placed` + 4 rejected stages).
- Render them as two adjacent metric cards labeled **"Master list"** and **"Active pipeline"**.

### D. Days Active — editable search-start date

- New row in a small `app_settings` table (single-row pattern) with a `search_start_date` column, default `'2026-04-01'`. RLS: recruiters read/write, clients read.
- `dashboard.functions.ts` reads `search_start_date` instead of computing from earliest `created_at`. Days Active = `today - search_start_date`.
- Settings page (`src/routes/_authenticated/settings.tsx`) gets a date picker (shadcn `<Calendar>` in a popover) bound to `search_start_date`, with Save button.
- Backfill the row with `2026-04-01` in the migration.

---

## Out of scope

- Target Fit candidates currently in a Rejected stage (~68) **will be auto-downgraded** by the migration's one-shot fix — confirming this is what you want when you approve.
- No new "Not Pursued" stage. Too Senior / Too Junior / Off-function stay at `Sourced` and are filtered out of Active pipeline by `fit`.

---

## Files touched

- `src/components/candidates/CandidatesTable.tsx`
- `src/lib/dashboard.functions.ts`
- `src/components/dashboard/Dashboard.tsx`
- `src/routes/_authenticated/settings.tsx`
- New migration: trigger update + one-shot fit cleanup + `app_settings` table seeded with `2026-04-01`
