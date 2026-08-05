import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, ExternalLink, ShieldCheck, Sparkles, Store } from "lucide-react";
import { AppShell, NeonCard, SectionTitle, GoldRing } from "@/components/idspace/shell";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — ID•SPACE FINANCE" },
      { name: "description", content: "Discover the IDPI Marketplace — halal Web3 commerce powered by Pi Network." },
      { property: "og:title", content: "Marketplace — ID•SPACE FINANCE" },
      { property: "og:description", content: "Discover the IDPI Marketplace — halal Web3 commerce powered by Pi Network." },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const openMarketplace = () => {
    window.open("https://gercepmart.pinet.com", "_blank", "noopener,noreferrer");
  };
  return (
    <AppShell active="Marketplace">
      <div className="glass-card p-4 lg:p-6">
        <SectionTitle icon={<Store className="h-4 w-4"/>} title="MARKETPLACE"/>
        <p className="text-sm text-emerald-100/70 max-w-2xl">
          Explore the official IDPI Marketplace — a halal Web3 commerce experience
          crafted for the Pi Network community. Shop, trade and support Ummah merchants.
        </p>
      </div>

      <NeonCard className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-[18px] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full anim-aurora"
            style={{ background: "radial-gradient(circle, rgba(255,215,106,.35), transparent 70%)", filter: "blur(30px)" }}/>
          <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full anim-aurora"
            style={{ background: "radial-gradient(circle, rgba(86,255,118,.35), transparent 70%)", filter: "blur(30px)", animationDelay: "-3s" }}/>

          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
            <GoldRing size={88}>
              <ShoppingBag className="h-10 w-10" style={{ color: "#FFD76A" }}/>
            </GoldRing>
            <div className="flex-1">
              <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI · Premium</div>
              <h3 className="mt-1 font-display text-2xl sm:text-3xl gold-shimmer leading-tight">
                Marketplace
              </h3>
              <p className="mt-2 text-sm text-emerald-100/70">
                Shop with Pi on the official IDPI Marketplace. Curated merchants,
                halal-friendly listings, and instant checkout inside the Pi Browser.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-emerald-100/60">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" style={{color:"#56FF76"}}/>Shariah friendly</span>
                <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" style={{color:"#FFD76A"}}/>Pi Network powered</span>
              </div>
            </div>
          </div>

          <button
            onClick={openMarketplace}
            className="group relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 anim-pulse-glow"
            style={{
              background: "linear-gradient(90deg, #FFD76A, #56FF76, #FFD76A)",
              backgroundSize: "200% 100%",
              animation: "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite",
            }}
          >
            <ShoppingBag className="h-4 w-4"/>
            Open Marketplace (IDPI)
            <ExternalLink className="h-4 w-4"/>
          </button>
        </div>
      </NeonCard>
    </AppShell>
  );
}
