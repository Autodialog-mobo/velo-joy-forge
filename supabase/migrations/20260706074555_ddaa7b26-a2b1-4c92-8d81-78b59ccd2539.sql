DROP POLICY "Admins can view shop signups" ON public.shop_signups;
DROP POLICY "Admins can update shop signups" ON public.shop_signups;
CREATE POLICY "Admins and staff can view shop signups" ON public.shop_signups FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));
CREATE POLICY "Admins and staff can update shop signups" ON public.shop_signups FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'staff'::app_role));