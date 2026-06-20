
CREATE TABLE public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  template TEXT NOT NULL,
  order_id UUID NULL,
  recipient TEXT NULL,
  status TEXT NOT NULL,
  resend_id TEXT NULL,
  http_status INT NULL,
  error_message TEXT NULL,
  duration_ms INT NULL,
  metadata JSONB NULL
);
CREATE INDEX email_send_log_order_idx ON public.email_send_log(order_id);
CREATE INDEX email_send_log_created_idx ON public.email_send_log(created_at DESC);

GRANT SELECT ON public.email_send_log TO authenticated;
GRANT ALL ON public.email_send_log TO service_role;

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and staff can read email_send_log"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
