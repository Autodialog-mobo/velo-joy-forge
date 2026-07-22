-- A/B experiment: bundle-default nudge on /order.
-- Adds a variant marker to orders (which variant produced the order) and a
-- lightweight impressions table for the conversion denominator.

-- Which experiment variant the visitor saw when the order was created.
-- Format: "<experiment_key>:<variant>" (e.g. "bundle_default_v1:B"). Nullable:
-- orders from before the experiment, or visitors not bucketed, stay NULL.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS experiment_variant text;

-- Impressions: one row per visitor page-view of the experiment surface.
-- No PII; visitor_id is a random client-generated cookie id.
CREATE TABLE IF NOT EXISTS public.experiment_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment text NOT NULL,
  variant text NOT NULL,
  visitor_id text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exp_impr_lookup
  ON public.experiment_impressions (experiment, variant, environment);
CREATE INDEX IF NOT EXISTS idx_exp_impr_visitor
  ON public.experiment_impressions (visitor_id);

GRANT ALL ON public.experiment_impressions TO service_role;

ALTER TABLE public.experiment_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages experiment_impressions"
  ON public.experiment_impressions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
