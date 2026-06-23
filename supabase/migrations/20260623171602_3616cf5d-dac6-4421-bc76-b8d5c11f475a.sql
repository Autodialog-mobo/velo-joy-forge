ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recovery_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_mollie_payment_id text;