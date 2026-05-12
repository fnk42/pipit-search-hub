## 1. Fix: seniority tiles return empty results

**Cause:** `SeniorityRow` navigates with `search: "VP"` / `"Senior Associate"` / `"Managing Director"`, but the candidates `search` filter only `ilike`s `name`, `current_firm`, `email` — not `current_title`. So clicks land on an empty list even though the tile count is non-zero.

**Fix:** introduce a dedicated `seniority` filter that mirrors the dashboard's bucketing logic exactly, so tile counts and filtered list always agree.

### `src/lib/candidates.functions.ts`
- Extend the input validator with `seniority: z.enum(["vp","seniorAssociate","tooSenior"]).optional()`.
- When set, append a `.or(...)` over `current_title` using ilike patterns matching the same regex used in `dashboard.functions.ts`:
  - `tooSenior`: `current_title.ilike.%managing director%,current_title.ilike.%principal%,current_title.ilike.%head of%,current_title.ilike.%partner%,current_title.ilike.%chief%,current_title.ilike.% md%,current_title.ilike.%md %,current_title.ilike.%cio%,current_title.ilike.%cfo%,current_title.ilike.%coo%,current_title.ilike.%ceo%,current_title.ilike.%president%` — then post-filter in JS to drop rows where the only senior token is "vice president" (matches dashboard's exception).
  - `vp`: ilike `%vice president%`, `%vp%`, `%svp%`, `%evp%`. Post-filter to remove rows that also match a too-senior token (so buckets stay disjoint).
  - `seniorAssociate`: ilike `%senior associate%`, `%sr associate%`, `%sr. associate%`.
- Post-filter step runs after the SQL query, so SQL stays cheap and bucket math matches the dashboard.

### `src/routes/_authenticated/candidates.tsx`
- Add `seniority` to `validateSearch` (string from a fixed set, else undefined).
- Pass `seniority` from `search` into both `filters` initial state and the `useEffect` resync.
- Pass it into `listCandidates({ data: { ..., seniority: filters.seniority || undefined } })`.
- Include it in `handleFiltersChange` URL serialization.

### `src/components/candidates/CandidateFilters.tsx`
- Add `seniority?: string` to `Filters` and `defaultFilters`. No new visible control needed (URL-driven from dashboard); a small clear chip is enough so the user can see/remove the filter.

### `src/components/dashboard/Dashboard.tsx`
- Change `SeniorityRow` tiles from `search: "VP"` etc. to `seniority: "vp" | "seniorAssociate" | "tooSenior"`.

## 2. Weekly stats reshape

### `src/lib/dashboard.functions.ts`
- Add `addedThisMonth` to `weekly` (count where `date_sourced ?? created_at` is in current calendar month).
- Add `acceptedPct: number | null` = `round(accepted / total * 100)` where `accepted` = candidates whose `pipeline_stage` is **not** in `{"Sourced", "For Sean - Please reach out", ...REJECTED_STAGES}` and `total` = all candidates. (Lifetime metric, matching the user's "generally progressed through" definition; not time-windowed.)
- Keep `rejectedByTransformariThisWeek` and `rejectedPctThisWeek` in the type for now — only the UI tile is removed. (Cheap to compute; safe for any other consumer.)

### `src/components/dashboard/Dashboard.tsx` — `WeeklyStats`
Replace the four tiles with:
1. **Added today** — `w.addedToday`
2. **Added this week** — `w.addedThisWeek`
3. **Added this month** — `w.addedThisMonth`
4. **% Accepted** — `w.acceptedPct == null ? "—" : ${w.acceptedPct}%`, sub-label "Reached out or further"

No grid changes; still 4 tiles.

## Files touched
- `src/lib/candidates.functions.ts` — new `seniority` filter
- `src/lib/dashboard.functions.ts` — `addedThisMonth`, `acceptedPct`
- `src/routes/_authenticated/candidates.tsx` — wire `seniority` through URL/state
- `src/components/candidates/CandidateFilters.tsx` — add `seniority` to Filters type + clear chip
- `src/components/dashboard/Dashboard.tsx` — Seniority tiles use `seniority` param; WeeklyStats tiles updated

No schema changes. No RLS changes.
