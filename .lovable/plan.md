# Phase 2 Plan — Candidates CRUD + CSV Import

Build the Candidates list, dedicated detail page, single-row create/edit/delete, and CSV import for both candidates and PE firms. Single-row edits only — no multi-select. Activity log continues to capture stage changes via the existing trigger.

## 1. Candidates list (`/candidates`)

Replace the current "Coming soon" stub with a real recruiter workspace.

**Layout**
- Page header: "Candidates" title, total count pill, primary "Add candidate" button (gold), secondary "Import CSV" button.
- Toolbar row (sticky on scroll): search input (name / firm / email), filter dropdowns for Pipeline stage, Location, IR function, Client visible (Yes/No/All). "Clear filters" link when any active.
- Table (shadcn `Table`):
  - Columns: Name (link), Current firm, Title, Stage (colored badge), Location, Last contact, Next action, Client visible (eye icon toggle).
  - Row click → navigate to `/candidates/$id`.
  - Stage badge uses navy/gold/muted variants per stage group (active vs terminal).
  - Empty state: navy illustration block + "No candidates match these filters" + "Clear filters" / "Add candidate".
- Mobile (≤640px): collapses to a card list — name + firm + stage badge + next action.

**Client view**
- Same route, but the table is read-only: no Add/Import/edit controls, only `client_visible=true` candidates (RLS already enforces this), and the "Client visible" column is hidden.

## 2. Candidate detail (`/candidates/$id`)

Dedicated full page, two-column on desktop, stacked on mobile.

**Left column (8/12)**
- Header: name, current title @ current firm, LinkedIn icon link, edit/delete icon buttons (recruiters only).
- Stage selector: large dropdown that writes immediately and toasts "Stage moved to X" — this is the trigger that writes to `activity_log`.
- Tabs: **Overview** (all editable fields in a form) / **Activity** (timeline of `activity_log` rows for this candidate, recruiter-only) / **Notes** (markdown textarea, autosave on blur).
- Overview form fields: name, email, phone, current_firm, current_title, location_bucket, ir_functions (multi-select chips), source, last_contact_date, next_action, next_action_date, linkedin_url, client_visible toggle.
- Save bar appears when form is dirty: "Save changes" (gold) / "Discard". Validation via Zod.

**Right column (4/12)**
- "Quick facts" card: stage, location, IR functions chips, client visible status.
- "Engagement" card: created date, last updated, days in current stage.
- Delete confirmation uses shadcn `AlertDialog`.

**Client view of detail page**
- Read-only. No stage selector, no edit buttons, no Activity tab, notes hidden. Shows only: name, firm, title, location, IR functions, stage. If candidate is not `client_visible`, RLS returns nothing → render NotFound.

## 3. Add candidate

- "Add candidate" button opens a shadcn `Dialog` with the same Zod-validated form (minimal required fields: name + stage).
- On success → toast + navigate to the new `/candidates/$id`.

## 4. CSV Import (`/import`)

New route under `_authenticated`, recruiter-only (sidebar item visible only to recruiters; client gets a 403 redirect).

**Two tabs: Candidates / PE firms.**

Flow per tab:
1. **Upload** — drag-and-drop or file picker, `.csv` only, ≤2MB. Parsed in-browser with `papaparse`.
2. **Map columns** — table showing each CSV header with a dropdown to map to a target field (or "Skip"). Auto-suggests by header name match. Required target fields shown with a red asterisk; rows with missing required fields are flagged.
3. **Preview & validate** — first 20 rows rendered with per-cell validation errors (Zod). Counts: "X valid · Y errors". Errors block import.
4. **Import** — server function inserts in batches of 100 inside a single Supabase call per batch. Returns `{inserted, skipped, errors}`. Toast + link to the relevant list.

**Candidate target fields**: name (req), email, current_firm, current_title, pipeline_stage (defaults to Sourced), location_bucket, ir_functions (comma-separated), source, linkedin_url, notes, client_visible (defaults false).
**PE firm target fields**: name (req), tier, status (defaults to Target), aum_usd, hq_city, hq_state, notes.

Enums are validated against the Postgres enum values; unknown values surface as cell errors with a "did you mean…" hint.

## 5. Server functions (`src/lib/candidates.functions.ts`, `src/lib/import.functions.ts`)

All protected by `requireSupabaseAuth` so RLS enforces role boundaries automatically.

- `listCandidates({ search, stage, location, irFunction, clientVisible })` — returns rows.
- `getCandidate(id)` — single row + last 20 activity_log entries (recruiter only for activity).
- `createCandidate(input)` / `updateCandidate(id, patch)` / `deleteCandidate(id)`.
- `importCandidates(rows)` / `importPeFirms(rows)` — bulk insert, returns counts and errors.

Stage changes flow through the existing `log_pipeline_change` trigger; no extra logging code needed.

## 6. Sidebar + routing updates

- Wire the existing **Candidates** sidebar item to `/candidates`.
- Add a new **Import** sidebar item (recruiter only), icon `Upload`.
- Remove "Coming soon" from `candidates.tsx`.
- New files:
  - `src/routes/_authenticated/candidates.index.tsx` (list)
  - `src/routes/_authenticated/candidates.$id.tsx` (detail)
  - `src/routes/_authenticated/import.tsx` (CSV)
  - `src/components/candidates/CandidatesTable.tsx`
  - `src/components/candidates/CandidateFilters.tsx`
  - `src/components/candidates/CandidateForm.tsx`
  - `src/components/candidates/AddCandidateDialog.tsx`
  - `src/components/candidates/ActivityTimeline.tsx`
  - `src/components/candidates/StageBadge.tsx`
  - `src/components/import/CsvImporter.tsx` (shared UI)
  - `src/lib/candidates.functions.ts`
  - `src/lib/import.functions.ts`
  - `src/lib/csv-schemas.ts` (Zod schemas + enum maps)

## 7. Dependencies

Add: `papaparse`, `@types/papaparse`, `react-dropzone`. (Zod, shadcn Dialog/Table/Tabs/AlertDialog/Select/Toast all already present.)

## 8. Acceptance

- Recruiter: can list, filter, search, open detail, edit any field, change stage (logs activity), toggle client_visible, delete with confirm, add via dialog, and import a CSV with column mapping + preview.
- Client (Sean): sees a read-only table of only `client_visible=true` candidates with limited columns, can open a sanitized detail page, no Add/Import/Edit controls anywhere, no Import sidebar item.
- 375px viewport: list collapses to cards, detail stacks to single column, CSV mapper is horizontally scrollable.
- Stage changes visible in dashboard's Recent Activity feed.

## Out of scope (still deferred)

PE firm full CRUD UI (only CSV import for now), weekly report generation, settings UI, profile editing, bulk multi-select edits.
