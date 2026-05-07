
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('recruiter', 'client');
CREATE TYPE public.location_bucket AS ENUM ('Florida','Texas','Tri-State','Other US','International');
CREATE TYPE public.pipeline_stage AS ENUM ('Sourced','Contacted','Engaged','Screening','Client Interview','Offer','Placed','Declined','Passed');
CREATE TYPE public.ir_function AS ENUM ('Capital Raising','LP Relations','Reporting & Analytics','Marketing & Comms','Strategy');
CREATE TYPE public.pe_status AS ENUM ('Target','Contacted','Sourced From','Declined','Not Relevant');
CREATE TYPE public.pe_tier AS ENUM ('Tier 1','Tier 2','Tier 3');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ CANDIDATES ============
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  current_firm text,
  current_title text,
  location_bucket public.location_bucket,
  linkedin_url text,
  email text,
  phone text,
  ir_functions public.ir_function[] NOT NULL DEFAULT '{}',
  pipeline_stage public.pipeline_stage NOT NULL DEFAULT 'Sourced',
  source text,
  notes text,
  last_contact_date date,
  next_action text,
  next_action_date date,
  client_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- ============ PE FIRMS ============
CREATE TABLE public.pe_firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  aum_usd bigint,
  hq_city text,
  hq_state text,
  status public.pe_status NOT NULL DEFAULT 'Target',
  tier public.pe_tier,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pe_firms ENABLE ROW LEVEL SECURITY;

-- ============ ACTIVITY LOG ============
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Recruiters read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'recruiter'));

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Recruiters read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'recruiter'));

-- candidates: recruiters full access
CREATE POLICY "Recruiters select candidates" ON public.candidates FOR SELECT USING (public.has_role(auth.uid(),'recruiter'));
CREATE POLICY "Recruiters insert candidates" ON public.candidates FOR INSERT WITH CHECK (public.has_role(auth.uid(),'recruiter'));
CREATE POLICY "Recruiters update candidates" ON public.candidates FOR UPDATE USING (public.has_role(auth.uid(),'recruiter'));
CREATE POLICY "Recruiters delete candidates" ON public.candidates FOR DELETE USING (public.has_role(auth.uid(),'recruiter'));
-- candidates: clients see only client_visible
CREATE POLICY "Clients select visible candidates" ON public.candidates FOR SELECT
  USING (public.has_role(auth.uid(),'client') AND client_visible = true);

-- pe_firms: recruiter only
CREATE POLICY "Recruiters all pe_firms" ON public.pe_firms FOR ALL
  USING (public.has_role(auth.uid(),'recruiter'))
  WITH CHECK (public.has_role(auth.uid(),'recruiter'));

-- activity_log: recruiter read, system inserts
CREATE POLICY "Recruiters read activity" ON public.activity_log FOR SELECT USING (public.has_role(auth.uid(),'recruiter'));
CREATE POLICY "Authenticated insert activity" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_candidates_updated BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pe_firms_updated BEFORE UPDATE ON public.pe_firms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Activity log trigger: pipeline_stage changes
CREATE OR REPLACE FUNCTION public.log_pipeline_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, payload)
    VALUES (auth.uid(), 'candidate_created', 'candidate', NEW.id,
      jsonb_build_object('name', NEW.name, 'stage', NEW.pipeline_stage));
  ELSIF TG_OP = 'UPDATE' AND NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, payload)
    VALUES (auth.uid(), 'stage_change', 'candidate', NEW.id,
      jsonb_build_object('name', NEW.name, 'from', OLD.pipeline_stage, 'to', NEW.pipeline_stage));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_candidates_activity AFTER INSERT OR UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.log_pipeline_change();

-- Auto-provision profile + role on signup based on email whitelist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email text := lower(NEW.email);
  _role public.app_role;
BEGIN
  IF _email LIKE '%@goldenpipitrecruiting.com' THEN
    _role := 'recruiter';
  ELSIF _email = 'sean@transformari.com' THEN
    _role := 'client';
  ELSE
    -- non-whitelisted: do not provision; user sees Access Denied in app
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
