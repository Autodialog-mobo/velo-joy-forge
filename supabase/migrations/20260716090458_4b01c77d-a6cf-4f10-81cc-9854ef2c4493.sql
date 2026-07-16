
CREATE TABLE public.shops_custom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text,
  country text,
  status text NOT NULL DEFAULT 'active',
  brands text[] NOT NULL DEFAULT '{}',
  lat double precision,
  lng double precision,
  address_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shops_custom TO anon;
GRANT SELECT ON public.shops_custom TO authenticated;
GRANT ALL ON public.shops_custom TO service_role;

ALTER TABLE public.shops_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active custom shops"
  ON public.shops_custom
  FOR SELECT
  USING (status = 'active');

CREATE OR REPLACE FUNCTION public.shops_custom_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shops_custom_touch
  BEFORE UPDATE ON public.shops_custom
  FOR EACH ROW EXECUTE FUNCTION public.shops_custom_touch_updated_at();
