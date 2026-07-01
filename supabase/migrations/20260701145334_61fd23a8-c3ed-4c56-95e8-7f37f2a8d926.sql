
CREATE TABLE public.margin_poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL DEFAULT 'unknown',
  choice text NOT NULL CHECK (choice IN ('ja','misschien','nee')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX margin_poll_responses_shop_key
  ON public.margin_poll_responses (lower(shop_name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.margin_poll_responses TO authenticated;
GRANT ALL ON public.margin_poll_responses TO service_role;

ALTER TABLE public.margin_poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read margin poll responses"
  ON public.margin_poll_responses
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
