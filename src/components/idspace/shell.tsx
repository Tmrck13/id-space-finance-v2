import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell, Menu, ScanLine, Wallet, Coins, Pickaxe, Moon, Store,
  PlayCircle, LineChart as LineChartIcon, Gift, Target, Ship, User,
  Settings, Home, BarChart3, RefreshCw, Crown, Sparkles,
} from "lucide-react";
import avatar from "@/assets/avatar.jpg";
import { toast } from "sonner";
import { MenuDrawer, SettingsDialog } from "@/components/idspace/menu-drawer";
import { useSettings, useTap } from "@/lib/app-settings";
import { PiAuthWidget } from "@/components/idspace/pi-auth-widget";
import { useNotifications } from "@/lib/notification-store";
import { useAnnouncements } from "@/components/idspace/announcements";

/* ---------- Living background (client-only stars to avoid SSR mismatch) ---------- */
export function LivingBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const stars = useMemo(
    () => Array.from({ length: 80 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      s: Math.random() * 1.6 + 0.4, d: Math.random() * 4,
    })), []
  );
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: "#050806" }}>
      <svg className="absolute inset-0 h-full w-full opacity-[.07]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="islamic" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M40 0 L80 40 L40 80 L0 40 Z M40 10 L70 40 L40 70 L10 40 Z" fill="none" stroke="#FFD76A" strokeWidth="0.6"/>
            <circle cx="40" cy="40" r="4" fill="#FFD76A"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic)"/>
      </svg>
      <div className="absolute -top-40 left-1/2 h-[70vh] w-[120vw] -translate-x-1/2 anim-aurora"
        style={{ background: "radial-gradient(closest-side, rgba(86,255,118,.35), transparent 70%)", filter: "blur(60px)" }}/>
      <div className="absolute bottom-0 right-0 h-[60vh] w-[80vw] anim-aurora"
        style={{ background: "radial-gradient(closest-side, rgba(255,215,106,.18), transparent 70%)", filter: "blur(80px)", animationDelay: "-6s" }}/>
      {mounted && stars.map((s, i) => (
        <span key={i} className="absolute rounded-full anim-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s,
            background: i % 5 === 0 ? "#FFD76A" : "#B6FFC7",
            boxShadow: `0 0 ${s.s*4}px currentColor`, animationDelay: `${s.d}s` }}/>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(to top, #050806, transparent)" }}/>
    </div>
  );
}

/* ---------- Building blocks ---------- */
export function GoldRing({ children, size = 56 }: { children: ReactNode; size?: number }) {
  return (
    <div className="relative grid place-items-center rounded-full anim-pulse-glow"
      style={{
        width: size, height: size,
        background: "radial-gradient(circle at 30% 30%, #12351D, #050806)",
        border: "1.5px solid rgba(255,215,106,.7)",
      }}>
      {children}
    </div>
  );
}

export function HexIcon({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid h-16 w-16 place-items-center">
      <div className="absolute inset-0 hex-clip"
        style={{ background: "linear-gradient(160deg, rgba(255,215,106,.35), rgba(86,255,118,.15))",
          boxShadow: "0 0 24px rgba(86,255,118,.35)" }}/>
      <div className="absolute inset-[2px] hex-clip"
        style={{ background: "linear-gradient(160deg, #0B1A12, #050806)" }}/>
      <div className="relative gold-text">{children}</div>
    </div>
  );
}

export function SectionTitle({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span style={{ color: "#56FF76" }}>{icon}</span>
        <h2 className="text-sm font-semibold tracking-[.28em] gold-text uppercase">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/* Animated gradient border wrapper */
export function NeonCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[20px] p-[1.5px] anim-pulse-glow ${className}`}
      style={{
        background: "linear-gradient(120deg, #FFD76A, #56FF76, #FFD76A)",
        backgroundSize: "200% 200%",
        animation: "shimmer 6s linear infinite, pulseGlow 3.5s ease-in-out infinite",
      }}>
      <div className="rounded-[18px] glass-card">{children}</div>
    </div>
  );
}

/* ---------- Sidebar ---------- */
const NAV: Array<{ icon: typeof Home; label: string; to?: string }> = [
  { icon: Home, label: "Dashboard", to: "/" },
  { icon: Wallet, label: "Wallet", to: "/wallet" },
  { icon: Coins, label: "Swap", to: "/swap" },
  { icon: Pickaxe, label: "Staking", to: "/staking" },
  { icon: Moon, label: "Check-In", to: "/checkin" },
  { icon: Store, label: "Marketplace", to: "/marketplace" },
  { icon: PlayCircle, label: "Entertainment", to: "/entertainment" },
  { icon: Crown, label: "Premium", to: "/premium" },
  { icon: LineChartIcon, label: "Community", to: "/community" },
  { icon: Gift, label: "Rewards", to: "/checkin" },
  { icon: Bell, label: "Alerts", to: "/notifications" },
  { icon: Target, label: "Missions" },
  { icon: Ship, label: "Hangar" },
  { icon: User, label: "Profile", to: "/profile" },
  { icon: Settings, label: "Settings" },
];

export function Sidebar({ active }: { active: string }) {
  const { unreadCount } = useNotifications();
  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col gap-4 p-4"
      style={{ background: "linear-gradient(180deg, rgba(11,26,18,.9), rgba(5,8,6,.95))",
        borderRight: "1px solid rgba(255,215,106,.15)" }}>
      <div className="glass-card flex flex-col items-center gap-2 p-4">
        <div className="anim-pulse-glow rounded-full p-[3px]" style={{ background: "linear-gradient(135deg, #FFD76A, #56FF76)" }}>
          <img src={avatar} alt="Rocky San" className="h-20 w-20 rounded-full object-cover" />
        </div>
        <div className="mt-2 text-lg font-semibold text-white">Rocky San</div>
        <div className="flex items-center gap-1 text-xs">
          <Crown className="h-3.5 w-3.5" style={{ color: "#FFD76A" }}/>
          <span className="gold-text">Level 15 · Sultan</span>
        </div>
      </div>
      <div className="glass-card flex items-center gap-3 p-3">
        <GoldRing size={40}>
          <span className="text-lg font-bold" style={{ color: "#FFD76A" }}>π</span>
        </GoldRing>
        <div>
          <div className="text-base font-semibold gold-shimmer">4,523.78</div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-300/70">IDPoints</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ icon: Icon, label, to }) => {
          const isActive = active === label;
          const isAlerts = label === "Alerts";
          const cls = `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            isActive ? "gold-border text-white" : "text-emerald-100/70 hover:text-white hover:bg-emerald-900/20"
          }`;
          const style = isActive ? { background: "linear-gradient(90deg, rgba(86,255,118,.15), rgba(255,215,106,.05))" } : undefined;
          const inner = (
            <>
              <span className="relative">
                <Icon className="h-4.5 w-4.5" style={{ color: isActive ? "#FFD76A" : "#56FF76" }} size={18}/>
                {isAlerts && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px] text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </>
          );
          return to ? (
            <Link key={label} to={to} className={cls} style={style}>{inner}</Link>
          ) : (
            <button key={label} className={cls} style={style}>{inner}</button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-1 pb-2 opacity-80">
        <Sparkles className="h-10 w-10" style={{ color: "#C7A650" }}/>
        <div className="text-sm font-display tracking-[.35em] gold-shimmer">ID·SPACE</div>
        <div className="text-[10px] text-emerald-200/50">Ver. 2.0.0</div>
      </div>
    </aside>
  );
}

/* ---------- Header ---------- */
export function Header() {
  return (
    <header className="relative flex items-center justify-between p-4 lg:px-6">
      <div aria-hidden className="w-10"/>
      <div className="pointer-events-none flex-1 text-center">
        <Link to="/" className="pointer-events-auto inline-block">
          <div className="font-display text-2xl sm:text-3xl lg:text-4xl leading-none tracking-[.2em] gold-shimmer">ID·SPACE</div>
          <div className="mt-1 text-[10px] sm:text-xs tracking-[.6em] gold-text">FINANCE</div>
        </Link>
        <div className="mt-1 text-[10px] text-emerald-200/70">Built for the Pi Network Ecosystem</div>
        <div className="mt-1 font-[Amiri] text-lg" style={{ color: "#FFD76A" }} dir="rtl">
          بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </div>
      </div>
      <HeaderActions/>
    </header>
  );
}

function HeaderActions() {
  const tap = useTap();
  const { unreadCount } = useNotifications();
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/notifications"
        onClick={tap}
        className="relative grid h-10 w-10 place-items-center rounded-full glass-card transition active:scale-95 hover:-translate-y-0.5"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" style={{color:"#FFD76A"}}/>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      <button
        onClick={() => { tap(); toast("QR scanner coming soon"); }}
        className="grid h-10 w-10 place-items-center rounded-full glass-card transition active:scale-95 hover:-translate-y-0.5"
        aria-label="Scan"
      >
        <ScanLine className="h-4 w-4" style={{color:"#FFD76A"}}/>
      </button>
      <PiAuthWidget/>
    </div>
  );
}

/* ---------- Bottom nav ---------- */
type NavItem = { key: string; icon: ReactNode; labelKey: string; to?: string; badge?: number | null; action?: "menu" | "alerts" | "assets" };

function BottomNav({
  active, onOpenMenu,
}: { active: string; onOpenMenu: () => void }) {
  const { t } = useSettings();
  const tap = useTap();
  const { unreadCount } = useNotifications();

  const items: (NavItem | { mid: true })[] = [
    { key: "Home", icon: <Home className="h-4 w-4"/>, labelKey: "nav.home", to: "/" },
    { key: "Marketplace", icon: <Store className="h-4 w-4"/>, labelKey: "nav.market", to: "/marketplace" },
    { key: "Entertainment", icon: <PlayCircle className="h-4 w-4"/>, labelKey: "nav.play", to: "/entertainment" },
    { mid: true },
    { key: "Assets", icon: <Wallet className="h-4 w-4"/>, labelKey: "nav.assets", to: "/wallet" },
    { key: "Alerts", icon: <Bell className="h-4 w-4"/>, labelKey: "nav.alerts", badge: unreadCount || null, to: "/notifications" },
    { key: "Menu", icon: <Menu className="h-4 w-4"/>, labelKey: "nav.menu", action: "menu" },
  ];

  return (
    <nav className="sticky bottom-0 z-20 mt-4 glass-card mx-4 lg:mx-6 mb-3">
      <div className="relative grid grid-cols-7 items-end px-2 py-2">
        {items.map((it) => "mid" in it ? (
          <div key="mid" className="flex justify-center">
            <Link
              to="/swap"
              onClick={tap}
              className="relative -mt-8 grid h-16 w-16 place-items-center rounded-full anim-pulse-glow transition active:scale-95"
              style={{ background:"radial-gradient(circle, #FFD76A, #6b4a10)", border:"2px solid #FFD76A" }}
              aria-label="Swap"
            >
              <span className="text-2xl font-bold text-black">π</span>
            </Link>
          </div>
        ) : (() => {
          const isActive = active === it.key;
          const inner = (
            <>
              <span className="relative">
                {it.icon}
                {it.badge ? (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[9px] text-white">
                    {it.badge > 9 ? "9+" : it.badge}
                  </span>
                ) : null}
              </span>
              {t(it.labelKey)}
            </>
          );
          const cls = "relative flex flex-col items-center gap-1 py-1 text-[10px] transition active:scale-95 hover:-translate-y-0.5";
          const style = { color: isActive ? "#FFD76A" : "rgba(230,255,235,.7)" };
          const handle = () => {
            tap();
            if (it.action === "menu") onOpenMenu();
          };
          return it.to ? (
            <Link key={it.key} to={it.to} onClick={tap} className={cls} style={style}>{inner}</Link>
          ) : (
            <button key={it.key} onClick={handle} className={cls} style={style}>{inner}</button>
          );
        })())}
      </div>
    </nav>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  const { t } = useSettings();
  return (
    <footer className="mx-4 lg:mx-6 mb-4 mt-2 space-y-2 text-center text-[11px] text-emerald-100/50">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link to="/privacy" className="transition hover:text-emerald-100 hover:underline">Privacy Policy</Link>
        <span>•</span>
        <Link to="/terms" className="transition hover:text-emerald-100 hover:underline">Terms of Service</Link>
        <span>•</span>
        <Link to="/profile" className="transition hover:text-emerald-100 hover:underline">Profile</Link>
      </div>
      <p>{t("footer.copy")}</p>
    </footer>
  );
}

/* ---------- App shell wrapper ---------- */
export function AppShell({ active, children }: { active: string; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Keeps the notification badge fed with real, admin-published notifications.
  useAnnouncements();
  return (
    <div className="min-h-screen text-white font-sans" style={{ fontFamily: "Inter, system-ui" }}>
      <LivingBackground/>
      <div className="flex">
        <Sidebar active={active}/>
        <main className="flex-1 min-w-0">
          <Header/>
          <div className="mx-4 lg:mx-6 mt-4 space-y-4">{children}</div>
          <BottomNav active={active} onOpenMenu={() => setMenuOpen(true)}/>
          <Footer/>
        </main>
      </div>
      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => { setMenuOpen(false); setSettingsOpen(true); }}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)}/>
    </div>
  );
}

/* Re-export common icons for pages */
export { BarChart3, RefreshCw };
