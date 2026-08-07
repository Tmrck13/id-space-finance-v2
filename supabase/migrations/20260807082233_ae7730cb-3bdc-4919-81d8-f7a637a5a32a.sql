-- Helper: moderator-or-admin check (security definer, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.is_moderator() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_moderator() TO authenticated, service_role;

-- 1) transactions: remove blanket merchant read of every user's payments
DROP POLICY IF EXISTS "own transactions read" ON public.transactions;
CREATE POLICY "own transactions read"
ON public.transactions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_moderator());

-- 2) portfolio: writes are owner-only; admins keep read-only visibility
DROP POLICY IF EXISTS "own portfolio all" ON public.portfolio;
CREATE POLICY "portfolio read own or admin"
ON public.portfolio FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "portfolio insert own"
ON public.portfolio FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "portfolio update own"
ON public.portfolio FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "portfolio delete own"
ON public.portfolio FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 3) moderator scope: content management only (no roles, settings, wallets, balances, profiles)
CREATE POLICY "moderators manage banners"
ON public.banners FOR ALL TO authenticated
USING (public.is_moderator()) WITH CHECK (public.is_moderator());

CREATE POLICY "moderators manage running_text"
ON public.running_text FOR ALL TO authenticated
USING (public.is_moderator()) WITH CHECK (public.is_moderator());

CREATE POLICY "moderators manage notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.is_moderator()) WITH CHECK (public.is_moderator());

CREATE POLICY "moderators manage missions"
ON public.missions FOR ALL TO authenticated
USING (public.is_moderator()) WITH CHECK (public.is_moderator());

-- moderators may review activity logs, but only admins/service role write them
DROP POLICY IF EXISTS "admins read logs" ON public.admin_logs;
CREATE POLICY "admins and moderators read logs"
ON public.admin_logs FOR SELECT TO authenticated
USING (public.is_moderator());