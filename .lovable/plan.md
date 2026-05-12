## Untitled UI redesign — candidate tracker

A full visual overhaul of the candidates page (table, filters, tabs, badges) and the dashboard's State Breakdown chart, using Untitled UI tokens. Strictly visual + minor structural fixes — no DB or business-logic changes (except the existing seniority math, which is already correct).

### 1. Design tokens (`src/styles.css`)

Add Untitled UI palette as CSS variables alongside the existing tokens (don't rip out the existing parchment theme; new tokens are additive and used only by candidate views):

```
--uui-bg:        #FFFFFF;
--uui-row-hover: #F9FAFB;
--uui-header-bg: #F9FAFB;
--uui-border:    #EAECF0;
--uui-text:      #101828;
--uui-text-2:    #475467;
--uui-text-3:    #667085;
--uui-input-border: #D0D5DD;
--uui-blue-600:  #1570EF;
--uui-blue-50:   #EFF8FF;
--uui-blue-100:  #E0EAFF;
--uui-focus-ring: 0 0 0 4px #E0EAFF;
/* badge tones: red, amber, green, blue, neutral as listed in prompt */
```

Import Inter from Google Fonts in `index.html` (or via `@import` at top of styles.css). `--font-sans` already targets Inter.

### 2. Tabs — Untitled UI underline style

Replace the boxed shadcn `TabsList` on the candidates page with a custom underline tab bar:
- Container: `border-b border-[--uui-border]`
- Each tab: `px-1 pb-3 -mb-px text-sm font-semibold`
- Active: `text-[--uui-blue-600] border-b-2 border-[--uui-blue-600]`
- Inactive: `text-[--uui-text-3] border-b-2 border-transparent hover:text-[--uui-text]`
- Counts inline in same color, no separate badge

Implemented inline in `candidates.tsx` (don't touch shared `tabs.tsx`).

### 3. Filter bar (`CandidateFilters.tsx`)

- Container: `flex flex-wrap gap-3 bg-white border-[--uui-border] rounded-lg p-3` (or remove card chrome entirely — use plain row).
- Search input: `h-10 rounded-lg border-[--uui-input-border] pl-10 text-sm` with 20px `Search` icon at left, color `--uui-text-3`. Focus: blue border + 4px halo.
- Dropdowns: same `h-10 rounded-lg border-[--uui-input-border]` triggers; widen to `min-w-[160px]`. Override shadcn `SelectTrigger` className locally.
- Wrap to next line on small screens (already does).

### 4. Table — `CandidatesTable.tsx`

**Column structure** (single source of truth — strip current sticky/8px Title column):

| # | Column | Min width | Notes |
|---|--------|-----------|-------|
| 1 | Checkbox | 44px | recruiter only |
| 2 | Name | 200px | name + external link icon ONLY (no star, no title overlay) |
| 3 | Company | 180px | `current_firm`, secondary text |
| 4 | Stage | 200px | badge |
| 5 | Fit | 120px | badge |
| 6 | Location | 120px | text |
| 7 | Screen out reason | 220px | truncate w/ tooltip, recruiter only |
| 8 | Visible | 60px | eye toggle, recruiter only |
| 9 | Delete | 44px | trash icon, recruiter only |

**Removed**: separate Title column (8px), Owner, Sourced By, Sourced Date, Star icon in Name cell, sticky-left positioning. The "Title" data is dropped from the table view (still editable via candidate detail page).

**Header row**: `bg-[--uui-header-bg] border-b border-[--uui-border]`; `<th>` text `text-[11px] font-medium uppercase tracking-[0.05em] text-[--uui-text-2] px-3 py-3`.

**Body rows**: `h-[52px] border-b border-[--uui-border] hover:bg-[--uui-row-hover]`. Cells `px-3 py-3 align-middle text-sm`. Name = `font-medium text-[--uui-text]`; Company/Location/Screen = `text-[--uui-text-2] font-normal`.

**Name cell fix**: render only `<a>{name} <ExternalLink/></a>` (or `<Link>` if no LinkedIn). Remove the `flex items-center gap-1.5` Star wrapper. The Target Fit star indicator moves to the **Fit** badge column (kept inline with the badge as a small leading icon) so the Name column has zero extra elements.

**Checkbox**: shadcn `Checkbox` already 16x16; pass className for `border-[--uui-input-border] rounded` to match.

**Auto-stretch**: drop `w-auto min-w-full` and `whitespace-nowrap` on long-text cells; use `table-fixed` with explicit `<colgroup>` setting min widths above. At ≥1280px the table fills horizontally without scroll.

**Inline edit affordance** (item 10): update `EditableCell.tsx` Input/Select trigger className: when editing, apply `border-[--uui-blue-600] shadow-[var(--uui-focus-ring)]`. Behavior (Enter save / Esc cancel / blur save) already correct.

### 5. Badges — soft-tint Untitled UI

Rewrite `StageBadge.tsx` tone map to:
- Red (Rejected by Transformari): `bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]`
- Amber (Rejected by Candidate, In Progress alt): `bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]`
- Green (Approved/Shortlisted/Placed/Reached Out variants): `bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]`
- Blue (Screening/In Progress): `bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]`
- Neutral (Sourced/Unassessed/default): `bg-[#F2F4F7] text-[#344054] border-[#EAECF0]`

Badge shape: `inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium`. Replace the current pill (`rounded-full`, oklch fills).

Update `FIT_CLASS` in `CandidatesTable.tsx` similarly: Target Fit → green soft tint with leading 12px star; others → neutral.

### 6. Dashboard — State Breakdown bars

In `Dashboard.tsx` `StatCardsRow` Geography chart, swap palette to `["#1570EF", "#B54708", "#067647", "#7A5AF8", "#E31B54"]` and set `<Bar radius={[4,4,0,0]}>`. (No other dashboard changes.)

### 7. Items already satisfied — no further work

- VP + Senior Associate + Other = Total (already enforced server-side, item 11 only re-asserts existing behavior).
- Seniority filter chip + Total clear (already implemented in `candidates.tsx`).
- Inline editing exists; only the focus ring styling is updated (item 10 above).

### Files touched

- `src/styles.css` — add Untitled UI tokens + Inter import
- `src/components/candidates/CandidatesTable.tsx` — column overhaul, Name cell cleanup, Untitled UI styling, FIT_CLASS rewrite
- `src/components/candidates/CandidateFilters.tsx` — input/select restyle
- `src/components/candidates/StageBadge.tsx` — soft-tint tone map
- `src/components/candidates/EditableCell.tsx` — focus ring on edit state
- `src/routes/_authenticated/candidates.tsx` — underline tab bar
- `src/components/dashboard/Dashboard.tsx` — Geography palette swap

### Out of scope

- No DB migrations
- No changes to server functions, auth, or routing
- No mobile-card redesign (keeps current layout — desktop overhaul only)
- No changes to other dashboards/charts beyond Geography bars
