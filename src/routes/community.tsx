import { createFileRoute } from "@tanstack/react-router";
import {
  Send, MessageCircle, Instagram, Youtube, Facebook, Twitter,
  Music2, Globe, ExternalLink, Star, Heart,
} from "lucide-react";
import { AppShell, SectionTitle, GoldRing } from "@/components/idspace/shell";

export const Route = createFileRoute("/community")({
  component: CommunityPage,
  head: () => ({
    meta: [
      { title: "Community — IDPI" },
      { name: "description", content: "Join the IDPI community across WhatsApp, Telegram, Facebook, Instagram, TikTok, YouTube and X." },
    ],
  }),
});

const PI_BROWSER_URL = "https://ecosystem.pinet.com/apps/67f7c96da76daaad2cacfdd1";

type Social = {
  name: string;
  handle: string;
  url: string;
  icon: React.ReactNode;
  color: string;
};

const SOCIALS: Social[] = [
  { name: "WhatsApp Channel", handle: "IDPI Official", color: "#25D366",
    url: "https://whatsapp.com/channel/0029Vatxsu2CMY07xzOmpb3H",
    icon: <MessageCircle className="h-5 w-5"/> },
  { name: "Telegram", handle: "@Gerai_IDPS", color: "#26A5E4",
    url: "https://t.me/Gerai_IDPS",
    icon: <Send className="h-5 w-5"/> },
  { name: "Facebook", handle: "IDPI", color: "#1877F2",
    url: "https://www.facebook.com/share/1DrgWKhQHk/",
    icon: <Facebook className="h-5 w-5"/> },
  { name: "Instagram", handle: "@13team_rocket", color: "#E1306C",
    url: "https://www.instagram.com/13team_rocket/",
    icon: <Instagram className="h-5 w-5"/> },
  { name: "TikTok", handle: "@team_rocket13", color: "#FFD76A",
    url: "https://www.tiktok.com/@team_rocket13?_t=ZS-8yy2iMXtxdU&_r=1",
    icon: <Music2 className="h-5 w-5"/> },
  { name: "YouTube", handle: "@TeamRocket-IDPI", color: "#FF0000",
    url: "https://www.youtube.com/@TeamRocket-IDPI",
    icon: <Youtube className="h-5 w-5"/> },
  { name: "Twitter / X", handle: "@TmRocket121224", color: "#FFFFFF",
    url: "https://x.com/TmRocket121224",
    icon: <Twitter className="h-5 w-5"/> },
  { name: "Pi Browser", handle: "IDPI dApp", color: "#8A63FF",
    url: PI_BROWSER_URL,
    icon: <Globe className="h-5 w-5"/> },
];

function CommunityPage() {
  return (
    <AppShell active="Community">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Community</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">Join The Community</h1>
          <p className="mt-2 text-xs text-emerald-100/60">Follow us across the Ummah — one click opens each channel.</p>
        </div>

        <div className="glass-card p-4 lg:p-5">
          <SectionTitle icon={<Globe className="h-4 w-4"/>} title="OFFICIAL CHANNELS"/>
          <ul className="grid gap-2 md:grid-cols-2">
            {SOCIALS.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-3 rounded-xl p-3 transition hover:-translate-y-0.5 active:scale-[.98]"
                   style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.2)" }}>
                  <GoldRing size={44}><span style={{ color: s.color }}>{s.icon}</span></GoldRing>
                  <div className="flex-1">
                    <div className="text-sm text-white">{s.name}</div>
                    <div className="text-[11px] text-emerald-100/60">{s.handle}</div>
                  </div>
                  <ExternalLink className="h-4 w-4" style={{ color: "#FFD76A" }}/>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Rate Us */}
        <div className="relative rounded-2xl p-[1.5px] anim-pulse-glow mt-4"
             style={{
               background: "linear-gradient(120deg,#FFD76A,#56FF76,#FFD76A)",
               backgroundSize: "200% 200%",
               animation: "shimmer 6s linear infinite, pulseGlow 3.5s ease-in-out infinite",
             }}>
          <div className="rounded-[15px] glass-card p-5 text-center">
            <Heart className="mx-auto h-8 w-8" style={{ color: "#FF7676" }}/>
            <h2 className="mt-2 font-display text-2xl gold-shimmer">Rate IDPI ❤️‍🔥</h2>
            <div className="mt-2 flex items-center justify-center gap-1">
              {[0,1,2,3,4].map((i) => (
                <Star key={i} className="h-6 w-6" style={{ color: "#FFD76A", fill: "#FFD76A" }}/>
              ))}
            </div>
            <p className="mt-2 text-xs text-emerald-100/60">Support us — leave a 5-star review on the Pi Browser App page.</p>
            <a href={PI_BROWSER_URL} target="_blank" rel="noopener noreferrer"
               className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition active:scale-95"
               style={{
                 background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                 backgroundSize: "200% 100%",
                 animation: "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite",
               }}>
              <Star className="h-4 w-4"/> Give 5 Stars
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}