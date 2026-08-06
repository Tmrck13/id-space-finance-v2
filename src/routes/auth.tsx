import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell, NeonCard, GoldRing } from "@/components/idspace/shell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign In — ID•SPACE FINANCE" },
      { name: "description", content: "Sign in to your ID•SPACE FINANCE account to access your unified IDPI wallet, rewards and membership." },
      { property: "og:title", content: "Sign In — ID•SPACE FINANCE" },
      { property: "og:description", content: "Sign in to your ID•SPACE FINANCE account to access your unified IDPI wallet, rewards and membership." },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const target = safePath(search.redirect);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: target, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: target, replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
            data: { username: username || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirm(true);
          toast.success("Check your email to confirm your account");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${target}`,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  };

  return (
    <AppShell active="auth">
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <div className="mb-6 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Core</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </h1>
          <p className="mt-2 text-xs text-emerald-100/60">
            One IDPI identity for wallet, rewards and membership.
          </p>
        </div>

        <NeonCard>
          <div className="rounded-[18px] p-6">
            <div className="mb-5 flex justify-center">
              <GoldRing size={72}>
                <ShieldCheck className="h-8 w-8" style={{ color: "#FFD76A" }} />
              </GoldRing>
            </div>

            {sentConfirm ? (
              <div
                className="rounded-xl p-4 text-center text-sm"
                style={{ background: "rgba(86,255,118,.08)", border: "1px solid rgba(86,255,118,.4)" }}
              >
                <Mail className="mx-auto h-8 w-8" style={{ color: "#56FF76" }} />
                <p className="mt-2 text-white">Confirmation email sent</p>
                <p className="mt-1 text-xs text-emerald-100/60">
                  Open the link in {email} to activate your IDPI account.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" && (
                  <Field
                    icon={<UserPlus className="h-4 w-4" />}
                    placeholder="Username"
                    value={username}
                    onChange={setUsername}
                  />
                )}
                <Field
                  icon={<Mail className="h-4 w-4" />}
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                />
                <Field
                  icon={<Lock className="h-4 w-4" />}
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                />

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition active:scale-95 disabled:opacity-70"
                  style={{
                    background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 5s linear infinite",
                  }}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </button>
              </form>
            )}

            <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-emerald-100/40">
              <span className="h-px flex-1" style={{ background: "rgba(255,215,106,.2)" }} />
              or
              <span className="h-px flex-1" style={{ background: "rgba(255,215,106,.2)" }} />
            </div>

            <button
              onClick={google}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:-translate-y-0.5 disabled:opacity-70"
              style={{ background: "rgba(11,26,18,.7)", border: "1px solid rgba(255,215,106,.35)" }}
            >
              <GoogleMark />
              Continue with Google
            </button>

            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setSentConfirm(false);
              }}
              className="mt-4 w-full text-center text-xs text-emerald-100/60 underline-offset-4 hover:underline"
            >
              {mode === "signin"
                ? "New to IDPI? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </NeonCard>
      </div>
    </AppShell>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  required,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(11,26,18,.6)", border: "1px solid rgba(255,215,106,.18)" }}>
      <span className="text-emerald-100/50">{icon}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-emerald-50 outline-none placeholder:text-emerald-100/35"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.2c0-.8-.1-1.4-.2-2H12v3.9h6.2c-.1 1-.8 2.6-2.3 3.6l3.5 2.7c2.1-1.9 3.6-4.8 3.6-8.2z"/>
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.6l-3.5-2.7c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8l-3.6 2.8C3.7 20.4 7.5 23 12 23z"/>
      <path fill="#FBBC05" d="M5.5 14c-.2-.7-.4-1.4-.4-2s.1-1.3.3-2L1.8 7.2C1.1 8.7.7 10.3.7 12s.4 3.3 1.1 4.8L5.5 14z"/>
      <path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.3 1.7l3.1-3.1C17.5 2.2 15 1 12 1 7.5 1 3.7 3.6 1.8 7.2l3.7 2.8C6.4 7.4 9 5.4 12 5.4z"/>
    </svg>
  );
}
