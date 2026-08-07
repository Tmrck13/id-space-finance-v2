-- 1. Encrypted secret storage (service role only)
CREATE TABLE IF NOT EXISTS public.app_secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  hint text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: unreachable by anon/authenticated, service role bypasses RLS.
DROP TRIGGER IF EXISTS app_secrets_touch ON public.app_secrets;
CREATE TRIGGER app_secrets_touch BEFORE UPDATE ON public.app_secrets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Payment audit trail
CREATE TABLE IF NOT EXISTS public.pi_payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id text NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  event text NOT NULL,
  status text,
  txid text,
  source text NOT NULL DEFAULT 'app',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pi_payment_events TO authenticated;
GRANT ALL ON public.pi_payment_events TO service_role;
ALTER TABLE public.pi_payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read payment events" ON public.pi_payment_events;
CREATE POLICY "staff read payment events" ON public.pi_payment_events
  FOR SELECT TO authenticated USING (public.is_moderator());
CREATE INDEX IF NOT EXISTS pi_payment_events_payment_idx ON public.pi_payment_events (payment_id, created_at DESC);

-- 3. Entitlements (unlocked content)
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  kind text NOT NULL DEFAULT 'idpoints',
  quantity numeric NOT NULL DEFAULT 1,
  source_payment_id text UNIQUE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own entitlements read" ON public.user_entitlements;
CREATE POLICY "own entitlements read" ON public.user_entitlements
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_moderator());
DROP TRIGGER IF EXISTS user_entitlements_touch ON public.user_entitlements;
CREATE TRIGGER user_entitlements_touch BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS user_entitlements_user_idx ON public.user_entitlements (user_id, created_at DESC);

-- 4. Reconciliation run history
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  scanned integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  settled integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  trigger_source text NOT NULL DEFAULT 'cron',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.reconciliation_runs TO authenticated;
GRANT ALL ON public.reconciliation_runs TO service_role;
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read reconciliation runs" ON public.reconciliation_runs;
CREATE POLICY "admins read reconciliation runs" ON public.reconciliation_runs
  FOR SELECT TO authenticated USING (public.is_admin());

-- 5. Transactions hardening
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_payment_id_key ON public.transactions (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_open_status_idx ON public.transactions (status, updated_at) WHERE status IN ('created','approved','pending');

-- 6. One Pi account per member
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pi_uid_key ON public.profiles (pi_uid) WHERE pi_uid IS NOT NULL;