
CREATE TABLE public.order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  bundle_key text NOT NULL,
  bundle_sku text NOT NULL,
  quantity integer NOT NULL,
  sticker_count integer NOT NULL,
  unit_price_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_lines_order_id ON public.order_lines(order_id);

GRANT ALL ON public.order_lines TO service_role;

ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages order_lines"
  ON public.order_lines FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.orders_for_fulfillment
WITH (security_invoker = true) AS
SELECT
  o.*,
  CASE o.price_id
    WHEN 'frameid_solo_onetime'   THEN 'VP-FID-1'
    WHEN 'frameid_duo_onetime'    THEN 'VP-FID-2'
    WHEN 'frameid_family_onetime' THEN 'VP-FID-5'
    ELSE o.price_id
  END AS bundle_sku,
  CASE o.price_id
    WHEN 'frameid_solo_onetime'   THEN 1
    WHEN 'frameid_duo_onetime'    THEN 2
    WHEN 'frameid_family_onetime' THEN 5
    ELSE 0
  END AS stickers_per_bundle
FROM public.orders o
WHERE o.environment = 'live';

GRANT SELECT ON public.orders_for_fulfillment TO service_role;
