## Two things in this plan

### 1. Save future enhancements to project memory

Persist your roadmap notes so future sessions know about them. Create `mem://features/roadmap`:

- **Add fields:** `years_of_experience`, `owner` (assigned recruiter), `date_sourced`
- **Delete candidates** in the UI (single-row + bulk; server fn already exists)
- **Prevent double import** (dedupe on import — likely by email, with name+firm fallback)

Add a one-line reference in `mem://index.md` under Memories so the index stays the source of truth.

### 2. Diagnose & fix the Firm/Title mix-up

**What I found in the database** (sampled 10 candidates):
- `current_firm` is **NULL for every row**
- `current_title` has the actual titles (e.g. "VP, IR/Client Services")

So firm isn't being mixed up with title — firm is **empty**, and on the Candidates table the "Firm" column shows `—` with the title rendered as a small line beneath it (see `CandidatesTable.tsx` lines 140–143). That stacked layout makes it look like the title is wrongly in the firm column.

**Root cause:** the CSV auto-mapper in `src/components/import/CsvImporter.tsx` only matches when the normalized header is **contained inside** the field label. So:

| CSV header | Auto-mapped? |
|---|---|
| `Firm` | ✅ matches `current_firm` |
| `Title` | ✅ matches `current_title` |
| `Firm Name`, `Company`, `Employer` | ❌ unmapped → firm stays NULL |
| `Job Title`, `Position`, `Role` | ❌ unmapped → title stays NULL |

Your CSV almost certainly used `Firm Name` / `Company` (or similar), so on import the column was silently skipped.

**Fix — two parts:**

**A. Improve auto-mapping with header aliases.** Add an alias map in `csv-schemas.ts` so common variants resolve correctly:

- `current_firm`: firm, firm name, company, company name, employer, organization, current company, current employer
- `current_title`: title, job title, position, role, current title, current position
- `name`: full name, candidate, candidate name
- `email`: email address, e-mail
- `phone`: phone number, mobile, cell
- `linkedin_url`: linkedin, linkedin profile, profile url
- `location_bucket`: location, region, market
- `pipeline_stage`: stage, status
- `notes`: comments, remarks
- `source`: lead source, sourced from
- `ir_functions`: function, functions, ir function

`CsvImporter.onDrop` will check the alias map first, then fall back to the existing fuzzy logic.

**B. Clarify the table display.** In `CandidatesTable.tsx`, separate Firm and Title into their own columns instead of stacking title under firm. Updated header: `Name | Firm | Title | Stage | Location | Last contact | Next action | Visible`. Mobile card stays as-is (compact "Title · Firm" line).

**Re-import note:** since current rows have firm = NULL, after the fix you'll want to re-import your CSV (the wipe option is still available) so firms populate correctly.

### Out of scope for this plan
The roadmap items (years_of_experience, owner, date_sourced, delete UI, dedupe). They're being saved to memory only — not built yet.
