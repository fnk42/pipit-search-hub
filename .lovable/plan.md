## Wipe all sample candidates

Delete every row from the `candidates` table so you can import a clean CSV.

### What happens
- All current candidate rows are removed
- Related `activity_log` entries stay (audit history is preserved)
- No schema changes, no UI changes
- After approval, you'll be ready to upload your CSV via **Import CSV** on the Candidates page

### Technical detail
Single SQL: `DELETE FROM public.candidates;`