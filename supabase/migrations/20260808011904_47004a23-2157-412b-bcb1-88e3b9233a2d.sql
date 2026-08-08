-- Additive scheduling/localization fields for the announcement tables.
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.running_text
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS banners_touch ON public.banners;
CREATE TRIGGER banners_touch BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS running_text_touch ON public.running_text;
CREATE TRIGGER running_text_touch BEFORE UPDATE ON public.running_text
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS notifications_touch ON public.notifications;
CREATE TRIGGER notifications_touch BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS banners_active_window_idx ON public.banners (is_active, order_number);
CREATE INDEX IF NOT EXISTS running_text_active_window_idx ON public.running_text (is_active, priority DESC, order_number);
CREATE INDEX IF NOT EXISTS notifications_active_window_idx ON public.notifications (is_active, published_at DESC);