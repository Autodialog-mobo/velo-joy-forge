-- shop_signups: explicitly deny client-side inserts (public submissions go via service_role backend)
CREATE POLICY "Deny client inserts on shop signups" ON public.shop_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- user_roles: explicitly deny client-side writes (role management is backend-only)
CREATE POLICY "Deny client inserts on user roles" ON public.user_roles
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client updates on user roles" ON public.user_roles
  FOR UPDATE TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny client deletes on user roles" ON public.user_roles
  FOR DELETE TO anon, authenticated
  USING (false);