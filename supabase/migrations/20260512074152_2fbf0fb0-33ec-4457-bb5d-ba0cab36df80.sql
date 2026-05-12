-- 1. Enum
CREATE TYPE public.candidate_fit AS ENUM ('Target Fit','Too Junior','Too Senior','Off-function','Unassessed');

-- 2. Column
ALTER TABLE public.candidates
  ADD COLUMN fit public.candidate_fit NOT NULL DEFAULT 'Unassessed';

-- 3. Backfill from existing shortlist
UPDATE public.candidates SET fit = 'Target Fit' WHERE shortlisted = true;

-- 4. Trigger to keep shortlisted in sync with fit
CREATE OR REPLACE FUNCTION public.sync_fit_to_shortlisted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.shortlisted := (NEW.fit = 'Target Fit');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_fit_to_shortlisted
BEFORE INSERT OR UPDATE OF fit ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.sync_fit_to_shortlisted();

-- 5. Dedup: keep oldest row per lower(trim(name)), merge non-null fields from siblings
WITH ranked AS (
  SELECT id, lower(trim(name)) AS k, created_at,
         ROW_NUMBER() OVER (PARTITION BY lower(trim(name)) ORDER BY created_at ASC, id ASC) AS rn
  FROM public.candidates
),
keepers AS (SELECT id, k FROM ranked WHERE rn = 1),
losers  AS (SELECT id, k FROM ranked WHERE rn > 1),
merged AS (
  SELECT k.id AS keep_id,
         MAX(c.current_firm)        AS current_firm,
         MAX(c.current_title)       AS current_title,
         MAX(c.email)               AS email,
         MAX(c.phone)               AS phone,
         MAX(c.linkedin_url)        AS linkedin_url,
         MAX(c.location_bucket::text) AS location_bucket,
         MAX(c.notes)               AS notes,
         MAX(c.owner)               AS owner,
         MAX(c.screen_out_reason)   AS screen_out_reason,
         MAX(c.fnk_comments)        AS fnk_comments,
         MAX(c.feedback_transformari) AS feedback_transformari,
         MAX(c.date_sourced)        AS date_sourced,
         BOOL_OR(c.shortlisted)     AS shortlisted_any,
         MAX(c.fit::text)           AS best_fit
  FROM keepers k
  JOIN public.candidates c ON lower(trim(c.name)) = k.k AND c.id <> k.id
  GROUP BY k.id
)
UPDATE public.candidates t SET
  current_firm           = COALESCE(t.current_firm, m.current_firm),
  current_title          = COALESCE(t.current_title, m.current_title),
  email                  = COALESCE(t.email, m.email),
  phone                  = COALESCE(t.phone, m.phone),
  linkedin_url           = COALESCE(t.linkedin_url, m.linkedin_url),
  location_bucket        = COALESCE(t.location_bucket, m.location_bucket::location_bucket),
  notes                  = COALESCE(t.notes, m.notes),
  owner                  = COALESCE(t.owner, m.owner),
  screen_out_reason      = COALESCE(t.screen_out_reason, m.screen_out_reason),
  fnk_comments           = COALESCE(t.fnk_comments, m.fnk_comments),
  feedback_transformari  = COALESCE(t.feedback_transformari, m.feedback_transformari),
  date_sourced           = COALESCE(t.date_sourced, m.date_sourced),
  fit                    = CASE WHEN t.fit = 'Unassessed' AND m.best_fit IS NOT NULL
                                THEN m.best_fit::candidate_fit ELSE t.fit END
FROM merged m
WHERE t.id = m.keep_id;

DELETE FROM public.candidates
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(trim(name)) ORDER BY created_at ASC, id ASC) AS rn
    FROM public.candidates
  ) s WHERE rn > 1
);