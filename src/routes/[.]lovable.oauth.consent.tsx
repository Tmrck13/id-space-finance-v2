import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { AppShell, NeonCard, GoldRing } from "@/components/idspace/shell";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = {
  data?: { client?: { name?: string }; redirect_url?: string; redirect_to?: string } | null;
  error?: { message: string } | null;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data ?? null;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <AppShell active="auth">
      <div className="mx-auto w-full max-w-md px-4 py-10 text-center text-sm text-red-300">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </div>
    </AppShell>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "this app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <AppShell active="auth">
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <div className="mb-6 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Agent Access</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">Authorize Access</h1>
        </div>

        <NeonCard>
          <div className="rounded-[18px] p-6 text-center">
            <div className="mb-5 flex justify-center">
              <GoldRing size={72}>
                <ShieldCheck className="h-8 w-8" style={{ color: "#FFD76A" }} />
              </GoldRing>
            </div>
            <p className="text-white">
              Connect <span className="gold-text font-semibold">{clientName}</span> to your IDPI account
            </p>
            <p className="mt-2 text-xs text-emerald-100/60">
              It will be able to read your profile, wallet balances, transactions and notifications, and
              update your profile — acting as you. You can revoke access at any time.
            </p>

            {error && <div className="mt-4 text-xs text-red-300">{error}</div>}

            <div className="mt-6 space-y-2">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition active:scale-95 disabled:opacity-70"
                style={{
                  background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 5s linear infinite",
                }}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-emerald-50 transition disabled:opacity-70"
                style={{ background: "rgba(11,26,18,.7)", border: "1px solid rgba(255,215,106,.35)" }}
              >
                Deny
              </button>
            </div>
          </div>
        </NeonCard>
      </div>
    </AppShell>
  );
}
