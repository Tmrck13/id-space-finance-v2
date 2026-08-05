-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('user', 'merchant', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ MEMBERSHIP ============
CREATE TABLE public.membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL UNIQUE,
  badge text,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_frame text,
  profile_background text,
  order_number int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.membership TO anon, authenticated;
GRANT ALL ON public.membership TO service_role;
ALTER TABLE public.membership ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membership public read" ON public.membership FOR SELECT USING (true);
CREATE POLICY "admins manage membership" ON public.membership FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.membership (level, badge, benefits, profile_frame, profile_background, order_number) VALUES
  ('Bronze','bronze','["Daily check-in","Basic wallet"]','frame-bronze','bg-emerald-dark',1),
  ('Silver','silver','["Daily check-in","1% cashback"]','frame-silver','bg-emerald-dark',2),
  ('Gold','gold','["2% cashback","Priority support"]','frame-gold','bg-emerald-gold',3),
  ('Platinum','platinum','["3% cashback","Merchant tools"]','frame-platinum','bg-emerald-gold',4),
  ('Diamond','diamond','["4% cashback","Early features"]','frame-diamond','bg-space-gold',5),
  ('VIP','vip','["5% cashback","VIP events"]','frame-vip','bg-space-gold',6),
  ('Administrator','admin','["Full access"]','frame-admin','bg-space-gold',7);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pi_uid text UNIQUE,
  username text UNIQUE,
  email text,
  membership_level text NOT NULL DEFAULT 'Bronze' REFERENCES public.membership(level) ON UPDATE CASCADE,
  avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

-- ============ WALLETS (UNIFIED) ============
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  pi_balance numeric(20,6) NOT NULL DEFAULT 0 CHECK (pi_balance >= 0),
  idpoints_balance numeric(20,6) NOT NULL DEFAULT 0 CHECK (idpoints_balance >= 0),
  cashback_balance numeric(20,6) NOT NULL DEFAULT 0 CHECK (cashback_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet read" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- ============ LEDGER ============
CREATE TABLE public.ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  currency text NOT NULL DEFAULT 'idpoints' CHECK (currency IN ('pi','idpoints','cashback')),
  amount numeric(20,6) NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','cancelled','failed')),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_wallet_created_idx ON public.ledger (wallet_id, created_at DESC);
GRANT SELECT ON public.ledger TO authenticated;
GRANT ALL ON public.ledger TO service_role;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger read" ON public.ledger FOR SELECT TO authenticated USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = ledger.wallet_id AND w.user_id = auth.uid())
);

-- Guard: wallet balances can only change from inside a ledger-posting function.
CREATE OR REPLACE FUNCTION public.guard_wallet_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.pi_balance, NEW.idpoints_balance, NEW.cashback_balance)
     IS DISTINCT FROM (OLD.pi_balance, OLD.idpoints_balance, OLD.cashback_balance)
     AND coalesce(current_setting('idpi.ledger_posting', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'Wallet balances can only change via public.post_ledger_entry()';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER wallets_guard_balance BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_balance();

-- Single entry point for every balance change.
CREATE OR REPLACE FUNCTION public.post_ledger_entry(
  _user_id uuid,
  _transaction_type text,
  _currency text,
  _amount numeric,
  _description text DEFAULT NULL,
  _status text DEFAULT 'success',
  _reference text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wallet_id uuid;
  _ledger_id uuid;
BEGIN
  SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF _wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id) RETURNING id INTO _wallet_id;
  END IF;

  INSERT INTO public.ledger (wallet_id, transaction_type, currency, amount, description, status, reference)
  VALUES (_wallet_id, _transaction_type, _currency, _amount, _description, _status, _reference)
  RETURNING id INTO _ledger_id;

  IF _status = 'success' THEN
    PERFORM set_config('idpi.ledger_posting', 'on', true);
    UPDATE public.wallets SET
      pi_balance = pi_balance + CASE WHEN _currency = 'pi' THEN _amount ELSE 0 END,
      idpoints_balance = idpoints_balance + CASE WHEN _currency = 'idpoints' THEN _amount ELSE 0 END,
      cashback_balance = cashback_balance + CASE WHEN _currency = 'cashback' THEN _amount ELSE 0 END
    WHERE id = _wallet_id;
    PERFORM set_config('idpi.ledger_posting', 'off', true);
  END IF;

  RETURN _ledger_id;
END;
$$;
REVOKE ALL ON FUNCTION public.post_ledger_entry(uuid, text, text, numeric, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_ledger_entry(uuid, text, text, numeric, text, text, text) TO service_role;

-- Settle a pending ledger entry (deposit confirmation, withdraw approval).
CREATE OR REPLACE FUNCTION public.settle_ledger_entry(_ledger_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.ledger;
BEGIN
  SELECT * INTO r FROM public.ledger WHERE id = _ledger_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Ledger entry not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Ledger entry already settled'; END IF;

  UPDATE public.ledger SET status = _status, updated_at = now() WHERE id = _ledger_id;

  IF _status = 'success' THEN
    PERFORM set_config('idpi.ledger_posting', 'on', true);
    UPDATE public.wallets SET
      pi_balance = pi_balance + CASE WHEN r.currency = 'pi' THEN r.amount ELSE 0 END,
      idpoints_balance = idpoints_balance + CASE WHEN r.currency = 'idpoints' THEN r.amount ELSE 0 END,
      cashback_balance = cashback_balance + CASE WHEN r.currency = 'cashback' THEN r.amount ELSE 0 END
    WHERE id = r.wallet_id;
    PERFORM set_config('idpi.ledger_posting', 'off', true);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_ledger_entry(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_ledger_entry(uuid, text) TO service_role;

-- ============ REWARDS ============
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ledger_id uuid REFERENCES public.ledger(id) ON DELETE SET NULL,
  reward_type text NOT NULL,
  amount numeric(20,6) NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rewards read" ON public.rewards FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- ============ NOTIFICATIONS (admin/system only) ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_role public.app_role,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications read active" ON public.notifications FOR SELECT USING (
  is_active AND (target_role IS NULL OR public.has_role(auth.uid(), target_role))
);
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reads" ON public.notification_reads FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ BANNERS + RUNNING TEXT ============
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image text,
  title text,
  description text,
  link text,
  order_number int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read" ON public.banners FOR SELECT USING (is_active);
CREATE POLICY "admins manage banners" ON public.banners FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.running_text (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  order_number int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.running_text TO anon, authenticated;
GRANT ALL ON public.running_text TO service_role;
ALTER TABLE public.running_text ENABLE ROW LEVEL SECURITY;
CREATE POLICY "running_text public read" ON public.running_text FOR SELECT USING (is_active);
CREATE POLICY "admins manage running_text" ON public.running_text FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ ADMIN LOGS ============
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read logs" ON public.admin_logs FOR SELECT TO authenticated USING (public.is_admin());

-- ============ SIGNUP BOOTSTRAP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar, pi_uid)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'username', split_part(coalesce(NEW.email,'member'), '@', 1) || '_' || substr(NEW.id::text, 1, 6)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'pi_uid'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN NEW.raw_user_meta_data->>'account_type' = 'merchant' THEN 'merchant'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper for profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER ledger_touch BEFORE UPDATE ON public.ledger FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();