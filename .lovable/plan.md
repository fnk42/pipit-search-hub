## Goal

Add a **Fit** field as the new shortlist criterion, fix table layout (no horizontal scroll pain, no name wrap), add safe delete with a clean confirm dialog, and clean up duplicate rows from the double-import.

---

## Diagnosis: 572 vs 316

- DB currently has **572 candidates** (one import day: 2026-05-11).
- The CSV had **316 rows**.
- Importer matched on exact (lowercased) name+email, but ~half the CSV rows have no email → second run inserted them again instead of updating. Result: ~256 dupes.
- The "340" you saw is the **Shortlist count** (341 shortlisted), not the master count.

**Fix:** one-shot dedup migration (keep oldest row per `lower(trim(name))`, merge non-null fields from the duplicates, then drop the rest). After dedup we expect ~316 master rows.

---

## Schema changes (one migration)

1. `CREATE TYPE candidate_fit AS ENUM ('Target Fit','Too Junior','Too Senior','Off-function','Unassessed')`
2. `ALTER TABLE candidates ADD COLUMN fit candidate_fit NOT NULL DEFAULT 'Unassessed'`
3. **Backfill:** `UPDATE candidates SET fit='Target Fit' WHERE shortlisted = true` (covers all 341)
4. **Trigger** `sync_fit_to_shortlisted` (BEFORE INSERT/UPDATE OF fit): `NEW.shortlisted := (NEW.fit = 'Target Fit')`. The existing `sync_shortlist_visibility` trigger then auto-flips `client_visible`.
5. **Dedup pass** (separate statement in same migration): for each `lower(trim(name))` group >1, keep the row with earliest `created_at`, coalesce non-null fields from siblings into it, delete the rest.

---

## Importer hardening (`src/lib/csv-schemas.ts` + `import.functions.ts`)

- Add `fit` column with aliases (`Fit`, `Role Fit`); blank → `Unassessed`; fuzzy parse ("target"→Target Fit, "junior"→Too Junior, "senior"→Too Senior, "off"→Off-function).
- **Match key:** `lower(trim(name)) + lower(trim(coalesce(current_firm,'')))` instead of name+email — prevents email-less rows from re-inserting.

---

## UI changes

### Table layout (`CandidatesTable.tsx`)
- **Name column:** fixed `w-[180px]`, `truncate`, `whitespace-nowrap` — never wraps.
- **Title/Firm sub-line:** `truncate` with `title=` tooltip — cut off cleanly.
- **Sticky first column:** Name column gets `sticky left-0 bg-card z-10` so it stays visible while horizontally scrolling. Checkbox + star columns sticky too.
- **Sticky horizontal scrollbar:** wrap the table in a container with `overflow-x-auto` plus a top scrollbar (`dir="rtl"` shadow trick OR a small `<TopScroller>` component that mirrors the bottom scrollbar at the top of the table). User can scroll horizontally without going to bottom of page.
- **Compact columns:** reduce default cell padding (`px-2 py-1.5`), shrink "Sourced by" / "Owner" to `w-[110px]`, "Location" to `w-[120px]`, "Sourced" date `w-[96px]`.
- New **Fit** column (editable select, color-coded chip), placed right after Stage.
- New **trash icon** column on the right (recruiters only).

### Filters (`CandidateFilters.tsx`)
- Drop the `Seniority` chip (regex-based, brittle).
- Add **Fit** dropdown: All / Target Fit / Too Junior / Too Senior / Off-function / Unassessed.

### Tabs (`candidates.tsx`)
- Shortlist tab: count + filter by `fit === 'Target Fit'` (replaces `shortlisted` boolean read; trigger keeps them in sync, so existing client RLS still works).
- Bulk action bar: replace "Add/Remove shortlist" with **"Set fit →"** menu.

### Delete UX
- Trash icon in the row → opens **AlertDialog**: "Delete {name}? This can't be undone." with Cancel / Delete (destructive variant).
- On error, `toast.error` with the friendly message (no raw Postgres errors): map known errors → "Couldn't delete — please refresh and try again."
- `deleteCandidate` server fn already exists; just wire it.

### Add/Edit form (`CandidateForm.tsx`)
- Add Fit select, default Unassessed.

---

## Server (`candidates.functions.ts`)

- Add `fit` to `candidateInput` zod and to `filtersSchema`.
- Replace `seniority` regex filter block with `if (data.fit) q = q.eq("fit", data.fit)`.
- Keep `setShortlist`/`updateCandidate` as-is — trigger handles sync.

---

## Build checklist (I'll tick these off as I go)

- [ ] Migration: enum + column + backfill + trigger + dedup
- [ ] Verify post-migration counts (expect ~316 master, ~341 → Target Fit may shrink slightly after dedup)
- [ ] `csv-schemas.ts`: add Fit + aliases, tighten match key
- [ ] `candidates.functions.ts`: fit in zod + filter
- [ ] `CandidateFilters.tsx`: drop seniority, add Fit
- [ ] `CandidatesTable.tsx`: sticky Name col, no-wrap, truncated subtitle, compact widths, Fit col, trash col
- [ ] Top horizontal scrollbar (mirrored)
- [ ] Delete AlertDialog + friendly error mapping
- [ ] Bulk "Set fit" menu (replaces shortlist bulk)
- [ ] `candidates.tsx`: Shortlist tab reads `fit === 'Target Fit'`
- [ ] `CandidateForm.tsx` + `AddCandidateDialog`: Fit select
- [ ] Smoke test: filter by Fit, set fit on a row → shortlist tab updates → client_visible flips
- [ ] Update memory roadmap (delete UI shipped, dedup shipped)

---

## Out of scope

- No seniority enum / title parsing.
- No PE firms or dashboard changes.
