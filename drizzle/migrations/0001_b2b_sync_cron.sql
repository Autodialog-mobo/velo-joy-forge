CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.b2b_sync_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.b2b_sync_config TO service_role;

ALTER TABLE public.b2b_sync_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages b2b_sync_config"
  ON public.b2b_sync_config FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.b2b_sync_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
