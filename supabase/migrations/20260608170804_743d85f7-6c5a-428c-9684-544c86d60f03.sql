ALTER VIEW public.orders_for_fulfillment SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.mark_order_printed(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  update orders set status='printed', updated_at=now()
  where id=p_order_id and status='paid';
end; $$;

CREATE OR REPLACE FUNCTION public.mark_order_shipped(p_order_id uuid, p_tracking_code text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  update orders set status='shipped', updated_at=now()
  where id=p_order_id and status='printed';
end; $$;

REVOKE EXECUTE ON FUNCTION public.mark_order_printed(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_order_shipped(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_admin_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

CREATE POLICY "Admins can read allowlist"
  ON public.admin_email_allowlist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));