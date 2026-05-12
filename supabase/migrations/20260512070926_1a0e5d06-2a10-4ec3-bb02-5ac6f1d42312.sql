ALTER TYPE public.pe_status ADD VALUE IF NOT EXISTS 'Not started';
ALTER TYPE public.pe_status ADD VALUE IF NOT EXISTS 'Searched--No IR identified';
ALTER TYPE public.pe_status ADD VALUE IF NOT EXISTS 'Searched--candidates added';
ALTER TYPE public.pe_status ADD VALUE IF NOT EXISTS 'Blocked--manual review needed';