ALTER TABLE public.candidates ADD COLUMN shortlisted boolean NOT NULL DEFAULT false;
CREATE INDEX idx_candidates_shortlisted ON public.candidates(shortlisted) WHERE shortlisted = true;

CREATE OR REPLACE FUNCTION public.sync_shortlist_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.shortlisted THEN
      NEW.client_visible := true;
      INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, payload)
      VALUES (auth.uid(), 'shortlist_added', 'candidate', NEW.id, jsonb_build_object('name', NEW.name));
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.shortlisted IS DISTINCT FROM OLD.shortlisted THEN
    NEW.client_visible := NEW.shortlisted;
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, payload)
    VALUES (auth.uid(), CASE WHEN NEW.shortlisted THEN 'shortlist_added' ELSE 'shortlist_removed' END,
      'candidate', NEW.id, jsonb_build_object('name', NEW.name));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER candidates_sync_shortlist
BEFORE INSERT OR UPDATE OF shortlisted ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.sync_shortlist_visibility();