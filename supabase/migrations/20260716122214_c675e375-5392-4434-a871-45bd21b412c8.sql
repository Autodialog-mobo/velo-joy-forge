
-- Add stable shop_id
ALTER TABLE public.shops_custom
  ADD COLUMN IF NOT EXISTS shop_id text;

-- Sequence + default generator
CREATE SEQUENCE IF NOT EXISTS public.shops_custom_shop_id_seq;

CREATE OR REPLACE FUNCTION public.shops_custom_generate_shop_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.shop_id IS NULL OR NEW.shop_id = '' THEN
    NEW.shop_id := 'vp_' || lpad(nextval('public.shops_custom_shop_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill existing rows
UPDATE public.shops_custom
SET shop_id = 'vp_' || lpad(nextval('public.shops_custom_shop_id_seq')::text, 6, '0')
WHERE shop_id IS NULL OR shop_id = '';

ALTER TABLE public.shops_custom
  ALTER COLUMN shop_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shops_custom_shop_id_key
  ON public.shops_custom (shop_id);

DROP TRIGGER IF EXISTS shops_custom_shop_id_trg ON public.shops_custom;
CREATE TRIGGER shops_custom_shop_id_trg
BEFORE INSERT ON public.shops_custom
FOR EACH ROW EXECUTE FUNCTION public.shops_custom_generate_shop_id();
