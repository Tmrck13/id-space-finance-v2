import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle, ExternalLink, Copy, Film, Ticket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell, NeonCard, SectionTitle, GoldRing } from "@/components/idspace/shell";

const REFERRAL_CODE = "F20744139";
const PI_DRAMA_URL = "https://shortdrama.tiktok.com/t/ZSCakXY3E/";
const SHORTPRO_URL = `https://shortprodl.github.io?inviterId=${REFERRAL_CODE}`;

export const Route = createFileRoute("/entertainment")({
  head: () => ({
    meta: [
      { title: "Entertainment — ID•SPACE FINANCE" },
      { name: "description", content: "Watch Pi Drama and ShortPro — curated Web3 entertainment for the Pi Network community." },
      { property: "og:title", content: "Entertainment — ID•SPACE FINANCE" },
      { property: "og:description", content: "Watch Pi Drama and ShortPro — curated Web3 entertainment for the Pi Network community." },
    ],
  }),
  component: EntertainmentPage,
});

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyReferral() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(REFERRAL_CODE);
    } else {
      const ta = document.createElement("textarea");
      ta.value = REFERRAL_CODE;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    toast.success("Referral code copied successfully.");
  } catch {
    toast.error("Failed to copy referral code.");
  }
}

function PrimaryButton({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 anim-pulse-glow"
      style={{
        background: "linear-gradient(90deg, #FFD76A, #56FF76, #FFD76A)",
        backgroundSize: "200% 100%",
        animation: "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite",
      }}
    >
      {icon}
      {children}
      <ExternalLink className="h-4 w-4"/>
    </button>
  );
}

function SecondaryButton({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl gold-border py-3 text-sm gold-text transition hover:-translate-y-0.5"
      style={{ background: "rgba(11,26,18,.7)" }}
    >
      {icon}
      {children}
    </button>
  );
}

function EntertainmentPage() {
  return (
    <AppShell active="Play">
      <div className="glass-card p-4 lg:p-6">
        <SectionTitle icon={<PlayCircle className="h-4 w-4"/>} title="ENTERTAINMENT"/>
        <p className="text-sm text-emerald-100/70 max-w-2xl">
          Premium short-drama experiences curated for the Pi Network community —
          watch instantly and earn with referral rewards.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pi Drama */}
        <NeonCard>
          <div className="relative overflow-hidden rounded-[18px] p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full anim-aurora"
              style={{ background: "radial-gradient(circle, rgba(255,215,106,.3), transparent 70%)", filter: "blur(30px)" }}/>
            <div className="relative flex items-center gap-4">
              <GoldRing size={72}><Film className="h-8 w-8" style={{color:"#FFD76A"}}/></GoldRing>
              <div>
                <div className="text-[11px] tracking-[.4em] gold-text uppercase">Drama · 01</div>
                <h3 className="mt-1 font-display text-2xl gold-shimmer leading-tight">Pi Drama</h3>
                <p className="mt-1 text-xs text-emerald-100/60">Curated short-form drama for Pioneers.</p>
              </div>
            </div>
            <div className="mt-6">
              <PrimaryButton onClick={() => openExternal(PI_DRAMA_URL)} icon={<PlayCircle className="h-4 w-4"/>}>
                Watch Now
              </PrimaryButton>
            </div>
          </div>
        </NeonCard>

        {/* ShortPro */}
        <NeonCard>
          <div className="relative overflow-hidden rounded-[18px] p-6">
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full anim-aurora"
              style={{ background: "radial-gradient(circle, rgba(86,255,118,.3), transparent 70%)", filter: "blur(30px)", animationDelay: "-3s" }}/>
            <div className="relative flex items-center gap-4">
              <GoldRing size={72}><Ticket className="h-8 w-8" style={{color:"#FFD76A"}}/></GoldRing>
              <div>
                <div className="text-[11px] tracking-[.4em] gold-text uppercase">Drama · 02</div>
                <h3 className="mt-1 font-display text-2xl gold-shimmer leading-tight">ShortPro</h3>
                <p className="mt-1 text-xs text-emerald-100/60">Use the referral code to unlock rewards.</p>
              </div>
            </div>

            <div className="relative mt-5 rounded-xl p-4"
              style={{ background: "rgba(5,8,6,.65)", border: "1px solid rgba(255,215,106,.3)" }}>
              <div className="text-[10px] uppercase tracking-[.35em] gold-text flex items-center gap-1">
                <Sparkles className="h-3 w-3"/> Referral Code
              </div>
              <div className="mt-1 font-mono text-2xl font-bold gold-shimmer tracking-widest">
                {REFERRAL_CODE}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SecondaryButton onClick={copyReferral} icon={<Copy className="h-4 w-4"/>}>
                Copy Referral Code
              </SecondaryButton>
              <PrimaryButton onClick={() => openExternal(SHORTPRO_URL)} icon={<PlayCircle className="h-4 w-4"/>}>
                Watch Now
              </PrimaryButton>
            </div>
          </div>
        </NeonCard>
      </div>
    </AppShell>
  );
}