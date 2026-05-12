## Goal

Let the Comvest CSV (and future ones) import without status errors by adding the workflow statuses your team actually uses.

## New status values found in your CSV

- `Not started`
- `Searched--No IR identified`
- `Searched--candidates added`
- `Blocked--manual review needed`
- (blanks → will default to `Not started`)

These will be added alongside the existing 5: `Target`, `Contacted`, `Sourced From`, `Declined`, `Not Relevant`.

## Changes

1. **Database migration** (`pe_status` enum)
   - Add the 4 new values above to the `pe_status` Postgres enum.
   - Existing rows untouched.

2. **Importer schema** (`src/lib/csv-schemas.ts`)
   - Extend `PE_STATUSES` to include the 4 new values.
   - Default blank → `Not started` (instead of `Target`) to match your sheet's convention.

3. **PE firms UI** (table filter + edit dialog dropdown)
   - The status filter chips and edit-form dropdown read from `PE_STATUSES`, so they pick up the new options automatically. I'll verify color/styling for the new labels.

4. **Dashboard "PE coverage" metric**
   - Currently counts firms where status ∈ {`Contacted`, `Sourced From`}. I'll also count `Searched--candidates added` as "engaged" so your real progress shows up. (Tell me if you'd rather keep it strict.)

## Out of scope

- No change to `Layer` / `Next Layer Tag` — those are already free-text in the DB and your values (`Core`, `Next Layer`, `Infrastructure PE`, `Sector Specialist`, `Smaller AUM`) will import fine.
- Not touching candidates table.
