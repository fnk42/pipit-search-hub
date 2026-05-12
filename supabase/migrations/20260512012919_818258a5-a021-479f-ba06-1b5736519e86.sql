ALTER TABLE public.pe_firms
  ADD COLUMN IF NOT EXISTS aum_b numeric,
  ADD COLUMN IF NOT EXISTS hq text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS layer text,
  ADD COLUMN IF NOT EXISTS next_layer_tag text,
  ADD COLUMN IF NOT EXISTS aum_source text,
  ADD COLUMN IF NOT EXISTS website text;