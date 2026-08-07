CREATE OR REPLACE FUNCTION public.get_hidden_shop_address_keys()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT address_key FROM public.shops_custom WHERE hidden = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_hidden_shop_address_keys() TO public;

DROP POLICY IF EXISTS "Public read hidden shop address keys" ON public.shops_custom;