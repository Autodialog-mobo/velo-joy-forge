REVOKE EXECUTE ON FUNCTION public.mark_order_printed(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_order_shipped(uuid, text) FROM PUBLIC, anon, authenticated;