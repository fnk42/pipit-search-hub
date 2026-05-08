## Goals

1. Make all dashboard charts (IR function donut, geography bars, pipeline funnel rows) clickable — each click drills into `/candidates` pre-filtered by the segment.
2. Make the candidate name in the table link directly to LinkedIn (when present), instead of to the internal detail page.

## Implementation

### 1. URL-driven filters on `/candidates`

Add `validateSearch` to `src/routes/_authenticated/candidates.tsx` using `zodValidator` + `fallback`:

```
{ stage?, location?, irFunction?, search? }
```

Initialize the local `Filters` state from `Route.useSearch()` so deep links work, and keep the URL in sync when filters change (so the back button works after a chart drill-down).

### 2. Clickable charts in `Dashboard.tsx`

- **IR donut**: add `onClick` on `<Pie>` cells → `navigate({ to: "/candidates", search: { irFunction: name } })`. Add `cursor: pointer` + hover opacity.
- **Geography bars**: `onClick` on `<Bar>` → `navigate({ to: "/candidates", search: { location: bucket } })`.
- **Pipeline funnel rows**: wrap each row in a `<Link to="/candidates" search={{ stage: f.stage }}>` with hover state.
- Add a subtle visual cue (cursor pointer, hover ring) so users know they're clickable.

### 3. Candidate name → LinkedIn

In `src/components/candidates/CandidatesTable.tsx`:
- **Desktop table**: if `c.linkedin_url` exists, render the name as `<a href={linkedin_url} target="_blank" rel="noreferrer">` with a small external-link icon. If no LinkedIn URL, fall back to the internal `<Link to="/candidates/$id">`.
- **Mobile card**: same logic.
- Keep a separate way to reach the detail page — add a small "Details" affordance (e.g. a row-level button/icon, or make the firm/title cell the internal link) so recruiters can still open the candidate profile to see notes, activity, edit, etc.

## Open question I'll default on

For the LinkedIn change, I'll keep an internal "open detail" path via a small icon button on the row (recruiter view) so you don't lose access to notes, edit, shortlist toggle context, etc. If you'd rather have the name go to LinkedIn AND clicking anywhere else on the row open the detail page, say so and I'll switch.

## Files touched

- `src/routes/_authenticated/candidates.tsx` — add `validateSearch`, sync URL ↔ filters
- `src/components/dashboard/Dashboard.tsx` — clickable pie/bars/funnel rows
- `src/components/candidates/CandidatesTable.tsx` — name → LinkedIn, add detail affordance