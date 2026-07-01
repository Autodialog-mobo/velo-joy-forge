
ALTER TABLE public.shop_signups
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_updated_by uuid;

ALTER TABLE public.shop_signups
  DROP CONSTRAINT IF EXISTS shop_signups_status_check;
ALTER TABLE public.shop_signups
  ADD CONSTRAINT shop_signups_status_check
  CHECK (status IN ('new','contacted','converted','rejected'));

CREATE INDEX IF NOT EXISTS shop_signups_status_idx ON public.shop_signups(status);
CREATE INDEX IF NOT EXISTS shop_signups_lang_idx ON public.shop_signups(lang);
