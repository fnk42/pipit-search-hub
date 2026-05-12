
-- 1. app_settings table (single-row pattern)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  search_start_date date NOT NULL DEFAULT '2026-04-01',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read app_settings" ON public.app_settings;
CREATE POLICY "Authenticated read app_settings"
ON public.app_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Recruiters update app_settings" ON public.app_settings;
CREATE POLICY "Recruiters update app_settings"
ON public.app_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'recruiter'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role));

DROP POLICY IF EXISTS "Recruiters insert app_settings" ON public.app_settings;
CREATE POLICY "Recruiters insert app_settings"
ON public.app_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role));

INSERT INTO public.app_settings (id, search_start_date)
VALUES (true, '2026-04-01')
ON CONFLICT (id) DO NOTHING;

-- 2. Updated trigger function: clear fit when stage moves to a Rejected stage
CREATE OR REPLACE FUNCTION public.sync_fit_to_shortlisted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If stage is being set/changed to a Rejected stage, downgrade fit to Unassessed
  IF NEW.pipeline_stage::text LIKE 'Rejected by%' THEN
    NEW.fit := 'Unassessed';
  END IF;

  NEW.shortlisted := (NEW.fit = 'Target Fit');
  RETURN NEW;
END;
$$;

-- 3. One-shot fix: clear fit on currently-rejected Target Fit candidates
UPDATE public.candidates
SET fit = 'Unassessed'
WHERE fit = 'Target Fit'
  AND pipeline_stage::text LIKE 'Rejected by%';
