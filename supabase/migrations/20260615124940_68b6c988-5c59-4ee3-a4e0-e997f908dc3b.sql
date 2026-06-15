CREATE TABLE public.webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL DEFAULT 'mollie',
  origin_host   text,
  origin_kind   text NOT NULL DEFAULT 'other',
  payload_id    text,
  status        text NOT NULL,
  payment_status text,
  error_message text,
  received_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL    ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read webhook_events"
  ON public.webhook_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages webhook_events"
  ON public.webhook_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX webhook_events_received_at_idx
  ON public.webhook_events (received_at DESC);

CREATE INDEX webhook_events_origin_kind_idx
  ON public.webhook_events (origin_kind, received_at DESC);