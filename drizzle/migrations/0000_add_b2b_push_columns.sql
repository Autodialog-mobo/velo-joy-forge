ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS b2b_order_id text,
  ADD COLUMN IF NOT EXISTS b2b_pushed_at timestamptz,
  ADD COLUMN IF NOT EXISTS b2b_push_error text,
  ADD COLUMN IF NOT EXISTS b2b_price_flag text,
  ADD COLUMN IF NOT EXISTS b2b_environment text;

CREATE INDEX IF NOT EXISTS orders_b2b_pushed_at_idx ON public.orders (b2b_pushed_at);
