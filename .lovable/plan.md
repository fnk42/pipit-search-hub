## Polish pass — Name+Title stacked, uniform fonts, smaller badges, no overlap

### 1. Name cell: stacked Name + Title

Restore Title (`current_title`) as a second line beneath the candidate name in the Name column — keeps it visible without needing a dedicated column.

```
[Name]  ↗            ← row 1: 13px, font-medium, #101828
[Title]              ← row 2: 11px, font-normal, #475467, truncate
```

- Both lines wrapped in a single `<div>` so the link/external-icon affordance stays on the name only.
- Title is read-only here (still editable from the candidate detail page).
- Empty title: render nothing (no "—" placeholder; keeps row visually clean).

### 2. Row height grows to fit two lines

- Row min-height: `64px` (was `52px`).
- Vertical padding: `py-2.5` per cell.
- All other cells use `align-middle` so single-line content (Stage badge, Fit badge, Location, etc.) sits centered against the taller Name cell.

### 3. Selected-row gray shading

When `selected.has(c.id)` is true → `<TableRow className="bg-[#F9FAFB]">`. Same gray as hover. Fixes the "white name area" reading against gray rows.

### 4. Smaller, uniform badges (Stage + Fit)

Both `StageBadge` and `FitChip`:
- Padding `px-1.5 py-0`
- Text `text-[11px] font-medium leading-[18px]`
- Radius `rounded` (4px)
- Soft-tint colors unchanged.

### 5. Single uniform font scale

- Column headers: `text-[12px] font-medium uppercase tracking-[0.04em] text-[#475467]`
- Body cells (Company, Location, Screen-out, editable text/select): `text-[12px] leading-5`
- Name (line 1): `text-[13px] font-medium text-[#101828]`
- Title (line 2): `text-[11px] text-[#475467]`
- Badges: `text-[11px]`
- Drop hardcoded `text-sm` and `text-[8px]` from `EditableText` / `EditableSelect` — let parent cell font cascade.

### 6. Column widths — no overlap, no horizontal scroll at 1280px+

Drop the separate Company column (it was duplicating Title/Firm info that now lives stacked under Name). Wait — Company stays as its own column per the prior spec; it shows `current_firm` (firm name), Title shows `current_title` (job title). Keep both.

Recomputed budget for recruiter view (≈1280px content area):

| Column | Width | Notes |
|---|---|---|
| Checkbox | 44px | fixed |
| Name + Title | flex (~280px+) | only flexible column; both lines truncate |
| Company | 180px | truncate |
| Stage | 170px | smaller badge fits |
| Fit | 110px | |
| Location | 110px | |
| Screen-out reason | 200px | truncate w/ tooltip |
| Visible | 60px | icon |
| Delete | 44px | icon |

Sum fixed = ~918px → Name flexes to ~360px at 1280px. No overflow.

- Use `table-auto` (drop `table-fixed` + colgroup) and apply per-cell `max-w-[Npx]` + `truncate` so any long string ellipses instead of pushing neighbors.
- Each truncated cell gets a `title={value}` tooltip.

### Out of scope

- Filters, tabs, dashboard, mobile cards, server, DB — unchanged.

### Files touched

- `src/components/candidates/CandidatesTable.tsx` — Name+Title stack, row height, selected-row class, font scale, column widths, truncate wrappers
- `src/components/candidates/StageBadge.tsx` — smaller badge geometry
- `src/components/candidates/EditableCell.tsx` — drop hardcoded `text-sm` so font cascades
