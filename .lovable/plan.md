# Implementation plan

## 1. Typography (CandidatesTable.tsx)
- Title (now in Name cell sub-line) and Company (new column) render at exactly `fontSize: '8px'`, `lineHeight: '12px'`.

## 2. Spreadsheet-style auto-sizing (CandidatesTable.tsx)
- Drop fixed `w-[..px]` widths on `<TableHead>` / `<TableCell>` (except sticky checkbox).
- Add `whitespace-nowrap` to header cells and to short-content data cells (Stage, Fit, Location, Screen-out reason, Visible, Delete).
- Set table `w-auto min-w-full` so columns shrink to content; existing top/bottom synced scrollbar stays as a safety net for long firm names.

## 3. Name column cleanup (CandidatesTable.tsx)
- Remove the inner `min-w-0` + redundant `overflow-hidden` wrappers that cause the visible gap/overlay.
- Replace the sticky `shadow-[2px_0_4px_-2px_...]` with a crisp `border-r border-border`.
- Tighten cell padding to `py-1 pr-3` on the Name cell.

## 4. Inline-editable everywhere (CandidatesTable.tsx)
After steps 5 + 9 the live recruiter cells are: **Name, Title, Company, Stage, Fit, Location, Screen-out reason**. Each renders an `EditableText` / `EditableSelect` (Fit already does). Confirm + apply the wrapper cleanup from step 3 — no new component needed.

## 5. Remove Owner / Sourced by / Sourced date columns
Touched: `CandidatesTable.tsx`, `CandidateFilters.tsx`, `routes/_authenticated/candidates.tsx`.
- Delete the three `<TableHead>` and `<TableCell>` blocks.
- Drop unused `OWNERS` / `SOURCED_BY_OPTIONS` imports from the table.
- Remove `owner`, `sourcedBy` from filter UI, `defaultFilters`, `validateSearch`, and the `listCandidates` call site.
- DB columns stay (no migration), data preserved.

## 6. Reconcile Metrics totals (dashboard.functions.ts, Dashboard.tsx)
Redefine seniority so **VP + Senior Associate + Other = Master list total**.
- Server: classify each master-list candidate (everyone except `pipeline_stage = 'Placed'`) into exactly one bucket using `current_title`:
  1. `vp` → `/\b(vp|svp|evp|vice president)\b/i`
  2. `seniorAssociate` → `/\b(senior associate|sr\.? associate)\b/i`
  3. `other` → everything else (too-senior, junior, unmapped, missing title)
- Return `{ vp, seniorAssociate, other, total: masterTotal }`.
- UI: render four tiles — Total, VP, Senior Associate, Other. Total mirrors `masterTotal` so they always reconcile.

## 7. Working seniority filter end-to-end
- Add `seniority?: 'vp' | 'seniorAssociate' | 'other'` to `validateSearch` in `routes/_authenticated/candidates.tsx`.
- Apply a client-side filter in `CandidatesPage` on `current_title` using the same regex precedence as the server (Postgres regex on free text is awkward; client-side filter on the master list is correct here).
- When `search.seniority` is set, show a dismissible chip: `Filtered: VP × Clear` that clears the param.
- `SeniorityRow` tile clicks navigate with the matching `seniority` value; the **Total** tile navigates to `/candidates` with no params (clears all filters).

## 8. Geography / state breakdown chart colors (Dashboard.tsx)
Replace the single `fill="var(--metric-sky)"` on the `BarChart` with per-bar `<Cell>` elements using:
```
['#1e3a5f', '#d4a017', '#5b8c5a', '#c0392b', '#7d3c98']
```
Mapped 1:1 to Florida, Texas, Tri-State, Other US, International. Click-to-filter unchanged.

## 9. New Company column (CandidatesTable.tsx) — *added per latest request*
- Strip `· {firm}` from the Name cell's second line; that line keeps **only the title**, still at 8px.
- Insert a new **Company** column immediately after Name with `EditableText` bound to `current_firm`, also rendered at 8px to match Title (visually paired).
- Mobile cards: keep showing `title · firm` underneath the name (single compact line), so mobile layout is unchanged.
- Filtering, search (`name,current_firm,email`), and the `current_firm` field on the server are unchanged.

---

## Files touched
- `src/components/candidates/CandidatesTable.tsx` (1, 2, 3, 4, 5, 9)
- `src/components/candidates/CandidateFilters.tsx` (5)
- `src/routes/_authenticated/candidates.tsx` (5, 7)
- `src/lib/dashboard.functions.ts` (6)
- `src/components/dashboard/Dashboard.tsx` (6, 7, 8)

No DB migration. No server-function signature changes beyond the dashboard return shape.
