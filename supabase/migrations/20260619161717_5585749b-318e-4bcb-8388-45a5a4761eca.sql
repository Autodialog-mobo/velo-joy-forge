-- 1. Add 'staff' to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

-- 2. Add role column to allowlist (default admin for existing entries)
ALTER TABLE public.admin_email_allowlist
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'admin';

-- 3. Update trigger function to use role from allowlist
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  SELECT role INTO v_role
  FROM public.admin_email_allowlist
  WHERE email = NEW.email;

  IF v_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_admin_user() FROM PUBLIC, anon, authenticated;