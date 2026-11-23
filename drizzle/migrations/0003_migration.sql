ALTER TABLE public.shop_signups
  ADD COLUMN IF NOT EXISTS pushed_to_pro_public_id text,
  ADD COLUMN IF NOT EXISTS pushed_to_pro_user_id uuid,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;