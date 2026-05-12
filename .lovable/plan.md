## 1. Seniority metrics (Dashboard)

Derive from `current_title` (case-insensitive). No schema changes.

**Buckets** (in this order so "MD / VP" → Too senior):
1. **Too senior** — `\b(managing director|md|principal|head of|partner|chief|cio|cfo|coo|ceo|president)\b` (excluding "vice president")
2. **VP-level** — `\b(vp|svp|evp|vice president)\b`
3. **Senior Associate** — `senior associate` or `sr\.? associate`

**Backend** — `src/lib/dashboard.functions.ts`: include `current_title`, return `seniority: { vp, seniorAssociate, tooSenior }`.

**UI** — `Dashboard.tsx` (recruiter only): a "Sourced seniority" row with 3 colored tiles, each clickable to `/candidates?search=<keyword>`.

## 2. PE Firms (CRUD + manual add + CSV import)

### Schema migration — extend `public.pe_firms`
Add (all nullable, only `name` required):
- `aum_b numeric` (AUM in $B)
- `hq text`, `location text`
- `layer text`, `next_layer_tag text`
- `aum_source text`
- `website text` (for clickable company link)

Existing `aum_usd`, `hq_city`, `hq_state` stay in DB but UI stops using them. RLS unchanged (recruiter-only).

### `/pe-firms` page (replaces ComingSoon)
- Searchable table: **Name · AUM ($B) · HQ · Location · Layer · Next Layer Tag · Status · Source of AUM**.
- **Name cell** renders as a link to `website` (new tab + ExternalLink icon) when set; plain text otherwise — mirrors candidate→LinkedIn pattern.
- All cells editable inline via `EditableCell` (Name and Website included; Website edited via its own column or affordance next to the name).
- **Add firm dialog** for manual entry. Only **Name** required; everything else optional including Website.

### Server fns — `src/lib/pe-firms.functions.ts`
`listPeFirms`, `createPeFirm`, `updatePeFirm`, `deletePeFirm` — recruiter-gated via RLS.

### CSV import
- Update `peFirmRowSchema`, `PE_FIELDS`, `PE_HEADER_ALIASES` in `src/lib/csv-schemas.ts`. Name required; others optional. Aliases: Name, AUM (B)/AUM, HQ, Location, Layer, Next Layer Tag, Source of AUM Figure, Website/URL.
- Existing `/import` PE Firms tab uses `CsvImporter` + `importPeFirms` automatically once schema updates.

## 3. Candidates table polish

**Merge Name / Title / Company into one column** (`CandidatesTable.tsx`):
- Drop the separate Title and Company `<TableHead>`/`<TableCell>` pairs.
- The merged "Name" cell renders two stacked lines:
  - **Line 1**: name (bold, normal size). Linked to `linkedin_url` (new tab + ExternalLink) if present, else plain text. Star icon retained when shortlisted.
  - **Line 2**: `current_title · current_firm` in smaller muted text (`text-xs text-muted-foreground`). Em-dash if both empty; just one if only one is set.
- Cell uses `min-w-[260px]` and the lines use `truncate` with `whitespace-nowrap` to stay tight on one line each.
- Inline editing for title/company moves into this cell — small "edit" affordance on hover (or click-to-edit on the muted line) using existing `EditableText`. Keeps recruiter inline-edit functionality intact.
- Drop the broken `<FileText>` "open details" icon (stub detail page).

Result: 3 columns collapse to 1, table is tighter, names no longer line-break, secondary info stays visible but de-emphasized.

## 4. Smoother magic-link sign-in

**Symptoms:** clicking the OTP link returns to `/login`; sign-in then takes ~60s.

**Likely causes** (verify via `src/lib/auth-context.tsx`, `src/routes/login.tsx`, `src/routes/_authenticated.tsx`):
- `emailRedirectTo` lands on a `_authenticated` route whose guard fires before Supabase parses the magic-link hash → bounces to `/login`.
- Auth context relies on `getSession()` polling instead of `onAuthStateChange`, delaying session pickup ~60s.

**Fixes:**
1. New public route `src/routes/auth/callback.tsx` — calls `supabase.auth.exchangeCodeForSession(window.location.href)` (handles PKCE `?code=` and legacy `#access_token=`), shows "Signing you in…", then navigates to `/dashboard` on success / `/login` on failure.
2. Set `emailRedirectTo: ${window.location.origin}/auth/callback` in `login.tsx`.
3. In `auth-context`, register `onAuthStateChange` BEFORE `getSession()` so SIGNED_IN hydrates the role immediately.
4. Verify `_authenticated` guard waits for `loading === false` before redirecting.

---

### Files touched
- `supabase/migrations/<ts>_pe_firms_extend.sql`
- `src/lib/dashboard.functions.ts`, `src/components/dashboard/Dashboard.tsx`
- `src/lib/pe-firms.functions.ts` (new)
- `src/routes/_authenticated/pe-firms.tsx` (rewrite)
- `src/components/pe-firms/PeFirmsTable.tsx`, `AddPeFirmDialog.tsx` (new)
- `src/lib/csv-schemas.ts`
- `src/components/candidates/CandidatesTable.tsx` (merge Name/Title/Company, drop details icon)
- `src/routes/auth/callback.tsx` (new)
- `src/routes/login.tsx`
- `src/lib/auth-context.tsx` (listener-first ordering, if needed)
