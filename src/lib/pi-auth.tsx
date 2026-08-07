import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

/* Minimal Pi SDK typing — the SDK is loaded from Pi Browser at runtime. */
type PiAuthResult = {
  accessToken: string;
  user: { uid: string; username: string };
};
type PiSDK = {
  init: (opts: { version: string; sandbox?: boolean }) => Promise<void> | void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void,
  ) => Promise<PiAuthResult>;
};
declare global {
  interface Window { Pi?: PiSDK }
}

export type PiUser = { uid: string; username: string };
export type PiSessionStatus =
  | "idle" | "loading" | "authenticating" | "authenticated"
  | "unauthenticated" | "error";

type PiAuthCtx = {
  status: PiSessionStatus;
  user: PiUser | null;
  accessToken: string | null;
  error: string | null;
  sdkReady: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const STORAGE_KEY = "idspace.pi.session";
const SDK_URL = "https://sdk.minepi.com/pi-sdk.js";

type PiConfig = { sandbox: boolean; version: string };
let cachedConfig: PiConfig | null = null;

async function loadConfig(): Promise<PiConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch("/api/pi-config", { method: "GET" });
    if (res.ok) {
      const c = (await res.json()) as PiConfig;
      cachedConfig = { sandbox: !!c.sandbox, version: c.version || "2.0" };
      return cachedConfig;
    }
  } catch { /* ignore */ }
  cachedConfig = { sandbox: true, version: "2.0" };
  return cachedConfig;
}

const Ctx = createContext<PiAuthCtx | null>(null);

function loadSdk(): Promise<PiSDK | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Pi) return Promise.resolve(window.Pi);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Pi ?? null), { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve(window.Pi ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

type Persisted = { user: PiUser; accessToken: string; validatedAt: string };

function readStored(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    if (!p?.user?.uid || !p?.accessToken) return null;
    return p;
  } catch { return null; }
}

async function validateOnBackend(accessToken: string): Promise<PiUser> {
  const res = await fetch("/api/auth/pi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    user?: PiUser;
    roles?: string[];
    session?: { access_token: string; refresh_token: string } | null;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.user) {
    throw new Error(data.error || `Backend validation failed (${res.status})`);
  }
  // Adopt the linked Supabase session so RLS + roles apply on every request.
  if (data.session?.access_token && data.session?.refresh_token) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    } catch { /* degraded: Pi identity only */ }
  }
  return data.user;
}


export function PiAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PiSessionStatus>("idle");
  const [user, setUser] = useState<PiUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const sdkRef = useRef<PiSDK | null>(null);
  const autoRan = useRef(false);

  const clearSession = useCallback(() => {
    setUser(null); setAccessToken(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const doAuthenticate = useCallback(async (sdk: PiSDK) => {
    setStatus("authenticating"); setError(null);
    try {
    const result = await sdk.authenticate(["username", "payments"], (payment) => {
      // Resume incomplete payment via backend.
      void fetch("/api/public/pi/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      }).catch(() => { /* ignore */ });
    });
      if (!result?.accessToken) throw new Error("Authentication cancelled");
      const validated = await validateOnBackend(result.accessToken);
      const persisted: Persisted = {
        user: validated, accessToken: result.accessToken,
        validatedAt: new Date().toISOString(),
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)); } catch { /* ignore */ }
      setUser(validated); setAccessToken(result.accessToken);
      setStatus("authenticated");
      toast.success(`Welcome, @${validated.username}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Authentication failed";
      const friendly =
        /cancel/i.test(msg) ? "Authentication was cancelled." :
        /timeout/i.test(msg) ? "Network timeout — please try again." :
        /invalid/i.test(msg) ? "Invalid access token — please sign in again." :
        msg;
      setError(friendly); setStatus("error");
      clearSession();
      toast.error(friendly);
    }
  }, [clearSession]);

  const signIn = useCallback(async () => {
    if (typeof window === "undefined") return;
    setStatus("loading"); setError(null);
    let sdk = sdkRef.current;
    if (!sdk) {
      sdk = await loadSdk();
      if (!sdk) {
        const msg = "Pi SDK unavailable — please open this app inside the Pi Browser.";
        setError(msg); setStatus("error"); toast.error(msg);
        return;
      }
      try {
        const cfg = await loadConfig();
        await sdk.init({ version: cfg.version, sandbox: cfg.sandbox });
      } catch {
        const msg = "Pi SDK failed to initialize.";
        setError(msg); setStatus("error"); toast.error(msg);
        return;
      }
      sdkRef.current = sdk;
      setSdkReady(true);
    }
    await doAuthenticate(sdk);
  }, [doAuthenticate]);

  const signOut = useCallback(() => {
    clearSession();
    void import("@/integrations/supabase/client")
      .then(({ supabase }) => supabase.auth.signOut())
      .catch(() => { /* ignore */ });
    setStatus("unauthenticated"); setError(null);
    toast("Signed out");
  }, [clearSession]);


  // Bootstrap: restore session and auto-authenticate on load.
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    let cancelled = false;

    (async () => {
      setStatus("loading");
      const stored = readStored();
      if (stored) {
        try {
          const validated = await validateOnBackend(stored.accessToken);
          if (cancelled) return;
          setUser(validated); setAccessToken(stored.accessToken);
          setStatus("authenticated");
          return;
        } catch {
          clearSession();
        }
      }
      const sdk = await loadSdk();
      if (cancelled) return;
      if (!sdk) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const cfg = await loadConfig();
        await sdk.init({ version: cfg.version, sandbox: cfg.sandbox });
      } catch {
        setStatus("unauthenticated");
        return;
      }
      sdkRef.current = sdk;
      setSdkReady(true);
      await doAuthenticate(sdk);
    })();

    return () => { cancelled = true; };
  }, [clearSession, doAuthenticate]);

  const value = useMemo<PiAuthCtx>(() => ({
    status, user, accessToken, error, sdkReady, signIn, signOut,
  }), [status, user, accessToken, error, sdkReady, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePiAuth(): PiAuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePiAuth must be used within <PiAuthProvider>");
  return v;
}