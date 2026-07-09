ALTER TABLE public.shop_signups
  ADD COLUMN IF NOT EXISTS pushed_to_pro_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pushed_to_pro_by UUID,
  ADD COLUMN IF NOT EXISTS pushed_to_pro_management_id TEXT;