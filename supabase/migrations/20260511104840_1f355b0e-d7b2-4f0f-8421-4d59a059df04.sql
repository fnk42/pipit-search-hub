-- Test data only; safe to wipe
TRUNCATE TABLE public.candidates CASCADE;

-- Drop default before swapping enum
ALTER TABLE public.candidates ALTER COLUMN pipeline_stage DROP DEFAULT;

-- Replace pipeline_stage enum with the 16-value set from the source sheet
ALTER TYPE public.pipeline_stage RENAME TO pipeline_stage_old;
CREATE TYPE public.pipeline_stage AS ENUM (
  'Sourced',
  'For Sean - Please reach out',
  'Reached Out',
  'Reached Out-Referral',
  'Responded/Scheduled for Screening',
  'Profile Screened by Sam',
  'Profile Screened by Stephanie',
  'Initial Screening (Sam/Stephanie)',
  'Final Screening (Sean)',
  'Client Interviews',
  'Offer',
  'Placed',
  'Rejected by Candidate',
  'Rejected by Transformari',
  'Rejected by Client',
  'Rejected by GPR (Felix)'
);
ALTER TABLE public.candidates
  ALTER COLUMN pipeline_stage TYPE public.pipeline_stage
  USING 'Sourced'::public.pipeline_stage;
ALTER TABLE public.candidates
  ALTER COLUMN pipeline_stage SET DEFAULT 'Sourced'::public.pipeline_stage;
DROP TYPE public.pipeline_stage_old;

-- Replace ir_function enum with the 3-value set from the source sheet
ALTER TABLE public.candidates ALTER COLUMN ir_functions DROP DEFAULT;
ALTER TYPE public.ir_function RENAME TO ir_function_old;
CREATE TYPE public.ir_function AS ENUM (
  'Fundraising/BD',
  'Client Services/LP Reporting',
  'Unclear'
);
ALTER TABLE public.candidates
  ALTER COLUMN ir_functions TYPE public.ir_function[]
  USING ARRAY[]::public.ir_function[];
ALTER TABLE public.candidates
  ALTER COLUMN ir_functions SET DEFAULT '{}'::public.ir_function[];
DROP TYPE public.ir_function_old;

-- New fields
ALTER TABLE public.candidates
  ADD COLUMN screen_out_reason text,
  ADD COLUMN feedback_transformari text,
  ADD COLUMN owner text,
  ADD COLUMN sourced_by text NOT NULL DEFAULT 'GPR Team';

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_owner_check
    CHECK (owner IS NULL OR owner IN ('Sam','Stephanie','Sean')),
  ADD CONSTRAINT candidates_sourced_by_check
    CHECK (sourced_by IN ('GPR Team','Transformari'));

-- Auto-default date_sourced to current_date when not supplied
CREATE OR REPLACE FUNCTION public.set_date_sourced_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.date_sourced IS NULL THEN
    NEW.date_sourced := current_date;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_date_sourced_default ON public.candidates;
CREATE TRIGGER trg_set_date_sourced_default
  BEFORE INSERT ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_date_sourced_default();
