
ALTER TABLE public.shops_custom
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS shops_custom_hidden_idx ON public.shops_custom (hidden) WHERE hidden = true;

-- Tighten public read policy so hidden overrides never leak on the map.
DROP POLICY IF EXISTS "Public read active custom shops" ON public.shops_custom;
CREATE POLICY "Public read active custom shops"
  ON public.shops_custom
  FOR SELECT
  USING (status = 'active' AND hidden = false);

-- Public helper: returns address_keys that admins have hidden.
-- Used by map components to filter out hidden static shops.
CREATE OR REPLACE FUNCTION public.get_hidden_shop_address_keys()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT address_key FROM public.shops_custom WHERE hidden = true;
$$;

REVOKE ALL ON FUNCTION public.get_hidden_shop_address_keys() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hidden_shop_address_keys() TO anon, authenticated;
