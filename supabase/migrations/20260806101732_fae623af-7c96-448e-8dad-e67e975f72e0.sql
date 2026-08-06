-- 1. Extend role enum with moderator
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- 2. TRANSACTIONS (Pi on-chain / Pi Platform payments)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id text UNIQUE,
  txid text,
  direction text NOT NULL DEFAULT 'user_to_app',
  amount_pi numeric NOT NULL DEFAULT 0,
  product_id text,
  memo text,
  network text NOT NULL DEFAULT 'testnet',
  status text NOT NULL DEFAULT 'created',
  ledger_id uuid REFERENCES public.ledger(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions read" ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.has_role(auth.uid(), 'merchant'));
CREATE POLICY "own transactions insert" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins update transactions" ON public.transactions FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON public.transactions (status);
CREATE INDEX IF NOT EXISTS transactions_txid_idx ON public.transactions (txid);
CREATE TRIGGER transactions_touch BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. PI AUTH SESSIONS
CREATE TABLE IF NOT EXISTS public.pi_auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  pi_uid text NOT NULL,
  pi_username text,
  scopes text[] NOT NULL DEFAULT ARRAY['username','payments']::text[],
  network text NOT NULL DEFAULT 'testnet',
  validated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pi_auth_sessions_pi_uid_key ON public.pi_auth_sessions (pi_uid);
CREATE INDEX IF NOT EXISTS pi_auth_sessions_user_idx ON public.pi_auth_sessions (user_id);
GRANT SELECT ON public.pi_auth_sessions TO authenticated;
GRANT ALL ON public.pi_auth_sessions TO service_role;
ALTER TABLE public.pi_auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pi session read" ON public.pi_auth_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE TRIGGER pi_auth_sessions_touch BEFORE UPDATE ON public.pi_auth_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. MISSIONS
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  mission_type text NOT NULL DEFAULT 'daily',
  target_value numeric NOT NULL DEFAULT 1,
  reward_currency text NOT NULL DEFAULT 'idpoints',
  reward_amount numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  order_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missions TO anon, authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions public read" ON public.missions FOR SELECT TO public USING (is_active);
CREATE POLICY "admins manage missions" ON public.missions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE INDEX IF NOT EXISTS missions_active_order_idx ON public.missions (is_active, order_number);
CREATE TRIGGER missions_touch BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress numeric NOT NULL DEFAULT 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  ledger_id uuid REFERENCES public.ledger(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);
GRANT SELECT, INSERT, UPDATE ON public.user_missions TO authenticated;
GRANT ALL ON public.user_missions TO service_role;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_missions read" ON public.user_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own user_missions insert" ON public.user_missions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own user_missions update" ON public.user_missions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS user_missions_user_idx ON public.user_missions (user_id);
CREATE TRIGGER user_missions_touch BEFORE UPDATE ON public.user_missions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. IDPOINTS event history
CREATE TABLE IF NOT EXISTS public.idpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ledger_id uuid REFERENCES public.ledger(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'earn',
  amount numeric NOT NULL DEFAULT 0,
  source text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.idpoints TO authenticated;
GRANT ALL ON public.idpoints TO service_role;
ALTER TABLE public.idpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own idpoints read" ON public.idpoints FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE INDEX IF NOT EXISTS idpoints_user_created_idx ON public.idpoints (user_id, created_at DESC);

-- 6. DAILY CHECK-IN
CREATE TABLE IF NOT EXISTS public.daily_checkin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  streak integer NOT NULL DEFAULT 1,
  reward_currency text NOT NULL DEFAULT 'idpoints',
  reward_amount numeric NOT NULL DEFAULT 0,
  ledger_id uuid REFERENCES public.ledger(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);
GRANT SELECT, INSERT ON public.daily_checkin TO authenticated;
GRANT ALL ON public.daily_checkin TO service_role;
ALTER TABLE public.daily_checkin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkin read" ON public.daily_checkin FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own checkin insert" ON public.daily_checkin FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS daily_checkin_user_date_idx ON public.daily_checkin (user_id, checkin_date DESC);

-- 7. PORTFOLIO
CREATE TABLE IF NOT EXISTS public.portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio TO authenticated;
GRANT ALL ON public.portfolio TO service_role;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own portfolio all" ON public.portfolio FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE INDEX IF NOT EXISTS portfolio_user_idx ON public.portfolio (user_id);
CREATE TRIGGER portfolio_touch BEFORE UPDATE ON public.portfolio
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 8. SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public settings read" ON public.settings FOR SELECT TO public USING (is_public);
CREATE POLICY "admins manage settings" ON public.settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE INDEX IF NOT EXISTS settings_key_idx ON public.settings (key);
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.settings (key, value, description, is_public) VALUES
  ('pi_network', '{"network":"testnet"}'::jsonb, 'Active Pi Network environment', true),
  ('app_maintenance', '{"enabled":false,"message":""}'::jsonb, 'Maintenance mode flag', true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.missions (code, title, description, mission_type, target_value, reward_amount, order_number) VALUES
  ('daily_checkin', 'Daily Check-in', 'Check in once every day to keep your streak alive.', 'daily', 1, 10, 1),
  ('complete_profile', 'Complete Your Profile', 'Add a username and avatar to your IDPI profile.', 'onetime', 1, 50, 2),
  ('first_swap', 'First Swap', 'Complete your first Pi to IDPoints swap.', 'onetime', 1, 100, 3)
ON CONFLICT (code) DO NOTHING;