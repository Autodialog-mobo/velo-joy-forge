CREATE TABLE public.shop_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vat text,
  first_name text,
  last_name text,
  shop_name text,
  address text,
  email text NOT NULL,
  phone text,
  pos_system text,
  pos_other text,
  lang text,
  ip text,
  user_agent text,
  confirmation_email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.shop_signups TO service_role;
GRANT SELECT, UPDATE ON public.shop_signups TO authenticated;

ALTER TABLE public.shop_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shop signups"
  ON public.shop_signups FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update shop signups"
  ON public.shop_signups FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX shop_signups_created_at_idx ON public.shop_signups (created_at DESC);
CREATE INDEX shop_signups_email_idx ON public.shop_signups (email);