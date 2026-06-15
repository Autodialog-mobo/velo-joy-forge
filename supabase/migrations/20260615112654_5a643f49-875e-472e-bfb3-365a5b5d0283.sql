ALTER TABLE public.orders ADD COLUMN deleted_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS orders_deleted_at_idx ON public.orders (deleted_at);