CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor text,
  actor_type text NOT NULL DEFAULT 'system',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_id_created_at_idx ON public.order_events (order_id, created_at DESC);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read order_events"
  ON public.order_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages order_events"
  ON public.order_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);