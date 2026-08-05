import { useState } from "react";
import { LogIn, LogOut, User as UserIcon, ShieldCheck, Loader2, X } from "lucide-react";
import avatar from "@/assets/avatar.jpg";
import { usePiAuth } from "@/lib/pi-auth";
import { useTap } from "@/lib/app-settings";

/** Compact Pi identity widget used in the header. */
export function PiAuthWidget() {
  const { status, user, signIn, signOut, error } = usePiAuth();
  const [open, setOpen] = useState(false);
  const tap = useTap();

  const busy = status === "loading" || status === "authenticating";
  const authed = status === "authenticated" && !!user;

  if (!authed) {
    return (
      <button
        onClick={() => { tap(); void signIn(); }}
        disabled={busy}
        className="relative flex h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-black transition active:scale-95 hover:-translate-y-0.5 disabled:opacity-70 anim-pulse-glow"
        style={{
          background: "linear-gradient(90deg, #FFD76A, #56FF76, #FFD76A)",
          backgroundSize: "200% 100%",
          animation: "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite",
        }}
        aria-label="Sign in with Pi"
        title={error ?? "Sign in with Pi"}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <span className="text-sm font-bold">π</span>}
        <span className="hidden sm:inline">
          {busy ? "Connecting…" : "Sign in with Pi"}
        </span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => { tap(); setOpen(true); }}
        className="flex items-center gap-2 rounded-full p-[2px] transition hover:-translate-y-0.5 active:scale-95"
        style={{ background: "linear-gradient(135deg,#FFD76A,#56FF76)" }}
        aria-label="Account"
      >
        <img src={avatar} alt={user!.username} className="h-9 w-9 rounded-full object-cover"/>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
             onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl p-[1.5px] anim-pulse-glow"
            style={{
              background: "linear-gradient(120deg, #FFD76A, #56FF76, #FFD76A)",
              backgroundSize: "200% 200%",
              animation: "shimmer 6s linear infinite, pulseGlow 3.5s ease-in-out infinite",
            }}
          >
            <div className="rounded-[15px] glass-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] tracking-[.4em] gold-text uppercase">Pi Account</div>
                <button onClick={() => setOpen(false)} className="rounded-full p-1 text-emerald-100/70 hover:text-white" aria-label="Close">
                  <X className="h-4 w-4"/>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="rounded-full p-[2px]" style={{ background: "linear-gradient(135deg,#FFD76A,#56FF76)" }}>
                  <img src={avatar} alt={user!.username} className="h-16 w-16 rounded-full object-cover"/>
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-white truncate">@{user!.username}</div>
                  <div className="flex items-center gap-1 text-[11px]" style={{ color: "#56FF76" }}>
                    <ShieldCheck className="h-3.5 w-3.5"/> Verified via Pi Network
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <Row label="Username" value={`@${user!.username}`}/>
                <Row label="Pi UID" value={user!.uid} mono/>
                <Row label="Status" value="Authenticated" accent="#56FF76"/>
              </div>

              <button
                onClick={() => { tap(); signOut(); setOpen(false); }}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg gold-border py-2.5 text-sm gold-text transition active:scale-[.98] hover:-translate-y-0.5"
              >
                <LogOut className="h-4 w-4"/> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
         style={{ background: "rgba(11,26,18,.6)", border: "1px solid rgba(255,215,106,.12)" }}>
      <span className="flex items-center gap-2 text-emerald-100/60">
        <UserIcon className="h-3.5 w-3.5" style={{ color: "#FFD76A" }}/>{label}
      </span>
      <span className={`truncate text-right ${mono ? "font-mono" : ""}`}
            style={{ color: accent ?? "#fff" }} title={value}>{value}</span>
    </div>
  );
}

/** Full sign-in card usable inside any page. */
export function PiSignInCard() {
  const { status, error, signIn } = usePiAuth();
  const busy = status === "loading" || status === "authenticating";
  const tap = useTap();
  return (
    <div className="glass-card p-5 text-center">
      <div className="text-[11px] tracking-[.4em] gold-text uppercase">Pi Network</div>
      <h3 className="mt-1 font-display text-xl gold-shimmer">Sign in to continue</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs text-emerald-100/60">
        Authenticate with your Pi identity to unlock personalized rewards, secure sessions, and Pi Payments.
      </p>
      <button
        onClick={() => { tap(); void signIn(); }}
        disabled={busy}
        className="mx-auto mt-4 flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-black transition active:scale-95 disabled:opacity-70 anim-pulse-glow"
        style={{
          background: "linear-gradient(90deg, #FFD76A, #56FF76, #FFD76A)",
          backgroundSize: "200% 100%",
          animation: "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite",
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <LogIn className="h-4 w-4"/>}
        {busy ? "Connecting…" : "Sign in with Pi"}
      </button>
      {error && <div className="mt-3 text-xs text-red-300">{error}</div>}
    </div>
  );
}