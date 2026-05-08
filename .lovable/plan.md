# Shortlisted vs Master list

Two views over the same candidate pool:
- **Master list** — every candidate the recruiter has sourced. Internal working set.
- **Shortlist** — the curated subset Sean (the client) sees and reviews.

## Decisions (defaults — say the word to change any)

1. **Model:** single boolean `shortlisted` on `candidates`. Simple, one global shortlist. Easy to extend to named shortlists later if needed.
2. **Visibility:** shortlisting a candidate **auto-flips `client_visible = true`**; un-shortlisting flips it back to false. Sean's Candidates page = the Shortlist. The manual visibility toggle stays for edge cases but is rarely needed.
3. **UI:** **Tabs at the top of `/candidates`** — `Master list` · `Shortlist (N)`. Same table, pre-applied filter. No new sidebar item (keeps nav clean).
4. **Actions:** star/unstar per row, **bulk select + "Add to shortlist" / "Remove from shortlist"**, and a count badge in the tab. Reorder/rank and PDF export deferred to a later phase (called out below).

## What changes

### Database
- Add `shortlisted boolean not null default false` to `candidates`.
- Index on `shortlisted` for fast filtering.
- Trigger: when `shortlisted` flips true → set `client_visible = true`; when flipped false → set `client_visible = false`. Also writes an `activity_log` entry (`shortlist_added` / `shortlist_removed`).
- RLS unchanged — clients still gated on `client_visible`.

### Server functions (`src/lib/candidates.functions.ts`)
- Extend `listCandidates` filter schema with `shortlisted: "yes" | "no" | "all"`.
- New `setShortlist({ ids: string[], shortlisted: boolean })` for bulk toggling.
- `candidateInput` schema gets `shortlisted` (recruiter-only writeable).

### UI
- **`/candidates` page**
  - `Tabs` at top: `Master list` | `Shortlist (N)`. Selected tab drives the `shortlisted` filter; count comes from the query.
  - Table gets a leading checkbox column (recruiter only) for multi-select.
  - When ≥1 row selected, a sticky action bar appears: `Add to shortlist` / `Remove from shortlist` / `Clear`.
  - New per-row star button (☆/★) next to the visibility eye — one click toggle.
  - The existing visibility eye stays but is de-emphasized (most users will just star).
- **Candidate detail page** — add a "Shortlisted" toggle near the visibility toggle, with a hint: "Shortlisted candidates are visible to the client."
- **Client view (Sean)** — the Candidates page already filters by `client_visible`. No tabs shown; he just sees the shortlist. Optional small header text: "Shortlist · N candidates".
- **Dashboard** — add a "Shortlisted" stat tile next to existing counts.

### CSV import
- Add optional `shortlisted` column to candidate CSV schema (yes/no/true/false). Defaults to false. If true on import, trigger auto-sets `client_visible`.

## Out of scope (call out, don't build now)
- Multiple named shortlists (e.g. "Round 1", "Round 2") — would need a `shortlists` join table. Easy migration later.
- Manual reordering/ranking within the shortlist.
- PDF export of the shortlist — natural fit with the planned Weekly Report.

## Technical notes
- Trigger runs `SECURITY DEFINER` with `SET search_path = public` (matches existing triggers).
- `setShortlist` uses a single `update ... where id = any($1)` — one round-trip; trigger handles per-row side effects.
- Tab count uses a lightweight `select count` server fn (or derive from already-fetched data when filter is `all`) to avoid a second full list query.
- Bulk action invalidates `["candidates"]` query key on success; toast shows `N added to shortlist`.

## Files touched (estimate)
- migration: 1 new
- `src/lib/candidates.functions.ts` — add field + bulk fn
- `src/lib/csv-schemas.ts` — add `shortlisted` to candidate row
- `src/routes/_authenticated/candidates.tsx` — tabs, selection state
- `src/components/candidates/CandidatesTable.tsx` — checkbox column, star button
- `src/components/candidates/CandidateFilters.tsx` — (no change; tabs handle it)
- `src/components/candidates/BulkActionBar.tsx` — new
- `src/components/candidates/CandidateForm.tsx` + detail page — shortlist toggle
- `src/components/dashboard/Dashboard.tsx` — stat tile
