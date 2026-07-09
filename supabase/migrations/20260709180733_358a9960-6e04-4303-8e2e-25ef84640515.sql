ALTER TABLE public.shop_signups
  ALTER COLUMN pushed_to_pro_by TYPE TEXT USING pushed_to_pro_by::text;

ALTER TABLE public.shop_signups
  ADD COLUMN IF NOT EXISTS pushed_to_pro_by_email TEXT;