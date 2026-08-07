REVOKE EXECUTE ON FUNCTION public.get_hidden_shop_address_keys() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.mark_order_printed(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.mark_order_shipped(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_hidden_shop_address_keys() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_printed(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_shipped(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;