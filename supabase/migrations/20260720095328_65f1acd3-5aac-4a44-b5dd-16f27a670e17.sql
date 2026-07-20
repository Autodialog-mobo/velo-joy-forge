CREATE OR REPLACE FUNCTION public.get_hidden_shop_address_keys()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT address_key FROM public.shops_custom WHERE hidden = true;
$$;

DROP POLICY IF EXISTS "Public read hidden shop address keys" ON public.shops_custom;
CREATE POLICY "Public read hidden shop address keys"
  ON public.shops_custom
  FOR SELECT
  USING (hidden = true);