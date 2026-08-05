import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Crown, Loader2, CheckCircle2, Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/idspace/shell";
import { PiSignInCard } from "@/components/idspace/pi-auth-widget";
import { usePiAuth } from "@/lib/pi-auth";
import { PiPayments } from "@/lib/pi-payments";
import { PI_PRODUCTS } from "@/lib/pi-products";

export const Route = createFileRoute("/premium")({
  component: PremiumStore,
  head: () => ({
    meta: [
      { title: "Premium Store — IDPI" },
      { name: "description", content: "Buy IDPoints and premium items with Pi on the IDPI Premium Store." },
    ],
  }),
});

function PremiumStore() {
  const { user, status } = usePiAuth();
  const product = PI_PRODUCTS.idpoints_starter;
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<null | { txid: string; idpoints: number }>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (user?.uid) PiPayments.getRewardBalance(user.uid).then(setBalance);
  }, [user?.uid, success]);

  const buy = async () => {
    if (!user) return;
    setBusy(true); setSuccess(null);
    const result = await PiPayments.createPayment({
      productId: product.id, userUid: user.uid, username: user.username,
    });
    setBusy(false);
    if (result.status === "completed") {
      setSuccess({ txid: result.txid, idpoints: result.reward?.idpoints ?? 0 });
      toast.success(`+${product.reward.idpoints} IDPoints granted!`);
    } else if (result.status === "cancelled") {
      toast("Payment cancelled");
    } else {
      toast.error(result.message || "Payment failed");
    }
  };

  return (
    <AppShell active="premium">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Premium</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">Premium Store</h1>
          <p className="mt-2 text-xs text-emerald-100/60">Pay with Pi on Testnet. Rewards granted instantly.</p>
          {user && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs gold-border">
              <Coins className="h-3.5 w-3.5" style={{ color: "#FFD76A" }}/>
              <span className="text-emerald-100/80">Balance:</span>
              <span className="font-semibold" style={{ color: "#56FF76" }}>{balance} IDPoints</span>
            </div>
          )}
        </div>

        {status !== "authenticated" || !user ? (
          <PiSignInCard/>
        ) : (
          <div
            className="relative rounded-2xl p-[1.5px] anim-pulse-glow"
            style={{
              background: "linear-gradient(120deg,#FFD76A,#56FF76,#FFD76A)",
              backgroundSize: "200% 200%",
              animation: "shimmer 6s linear infinite, pulseGlow 3.5s ease-in-out infinite",
            }}
          >
            <div className="rounded-[15px] glass-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
                     style={{ background: "linear-gradient(135deg,#12351D,#050806)", border: "1px solid rgba(255,215,106,.5)" }}>
                  <Crown className="h-7 w-7" style={{ color: "#FFD76A" }}/>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl gold-shimmer truncate">{product.name}</h2>
                  <p className="mt-1 text-xs text-emerald-100/70">{product.description}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat label="Price" value={`${product.amount} π`} color="#FFD76A"/>
                <Stat label="Reward" value={`${product.reward.idpoints} IDPoints`} color="#56FF76"/>
              </div>

              {success ? (
                <div className="mt-5 rounded-xl p-4 text-center anim-pulse-glow"
                     style={{ background: "rgba(86,255,118,.08)", border: "1px solid rgba(86,255,118,.4)" }}>
                  <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: "#56FF76" }}/>
                  <div className="mt-2 font-semibold text-white">Payment Completed</div>
                  <div className="mt-1 text-[11px] font-mono text-emerald-100/60 truncate" title={success.txid}>
                    txid: {success.txid}
                  </div>
                </div>
              ) : (
                <button
                  onClick={buy}
                  disabled={busy}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition active:scale-95 disabled:opacity-70 anim-pulse-glow"
                  style={{
                    background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite",
                  }}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                  {busy ? "Processing…" : "Buy with Pi"}
                </button>
              )}

              <p className="mt-3 text-center text-[10px] text-emerald-100/40">
                Pi Network Testnet • Secure U2A Payment
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg px-3 py-2"
         style={{ background: "rgba(11,26,18,.6)", border: "1px solid rgba(255,215,106,.12)" }}>
      <div className="text-[10px] uppercase tracking-widest text-emerald-100/50">{label}</div>
      <div className="mt-0.5 text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}