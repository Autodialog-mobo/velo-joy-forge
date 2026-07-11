ALTER TABLE public.shop_signups
  ADD COLUMN IF NOT EXISTS confirmation_email_error text,
  ADD COLUMN IF NOT EXISTS confirmation_email_attempted_at timestamptz;