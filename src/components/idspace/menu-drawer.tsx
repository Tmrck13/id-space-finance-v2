import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  X, Home, Store, PlayCircle, Wallet, LineChart, Pickaxe, Gift,
  Newspaper, Users, History, Bell, Settings as SettingsIcon, HelpCircle,
  Info, LogOut, Check, Globe, DollarSign, Moon, Volume2, Vibrate, ArrowDownUp, CalendarCheck,
  RefreshCw, Shield, FileText, ChevronRight, Star, Crown, User,
} from "lucide-react";
import { toast } from "sonner";
import {
  useSettings, useTap, LANGS, CURRENCIES, type Lang, type Currency,
} from "@/lib/app-settings";

type MenuKey =
  | "home" | "marketplace" | "play" | "swap" | "checkin" | "wallet" | "premium" | "finance"
  | "staking" | "rewards" | "news" | "community" | "history" | "rate"
  | "notifications" | "settings" | "help" | "about" | "logout" | "profile";

const ITEMS: { key: MenuKey; icon: typeof Home; to?: string; danger?: boolean }[] = [
  { key: "home", icon: Home, to: "/" },
  { key: "profile", icon: User, to: "/profile" },
  { key: "wallet", icon: Wallet, to: "/wallet" },
  { key: "marketplace", icon: Store, to: "/marketplace" },
  { key: "play", icon: PlayCircle, to: "/entertainment" },
  { key: "swap", icon: ArrowDownUp, to: "/swap" },
  { key: "checkin", icon: CalendarCheck, to: "/checkin" },
  { key: "staking", icon: Pickaxe, to: "/staking" },
  { key: "premium", icon: Crown, to: "/premium" },
  { key: "community", icon: Users, to: "/community" },
  { key: "notifications", icon: Bell, to: "/notifications" },
  { key: "history", icon: History, to: "/wallet" },
  { key: "rate", icon: Star, to: "/community" },
  { key: "finance", icon: LineChart, to: "/wallet" },
  { key: "rewards", icon: Gift, to: "/checkin" },
  { key: "news", icon: Newspaper },
  { key: "settings", icon: SettingsIcon },
  { key: "help", icon: HelpCircle, to: "/profile" },
  { key: "about", icon: Info, to: "/profile" },
  { key: "logout", icon: LogOut, danger: true },
];

/** Bottom-right main navigation drawer. */
export function MenuDrawer({
  open, onClose, onOpenSettings,
}: { open: boolean; onClose: () => void; onOpenSettings: () => void }) {
  const { t } = useSettings();
  const tap = useTap();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const handle = (it: (typeof ITEMS)[number]) => {
    tap();
    if (it.key === "settings") { onOpenSettings(); return; }
    if (it.key === "logout") { toast.success("Signed out (demo)"); onClose(); return; }
    if (!it.to) { toast(t("toast.comingSoon")); onClose(); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] animate-fade-in">
      <div className="absolute inset-0" onClick={onClose}
        style={{ background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }}/>
      <aside
        className="absolute right-0 top-0 h-full w-[min(92vw,380px)] overflow-y-auto p-4 animate-slide-in-right"
        style={{
          background: "linear-gradient(180deg, rgba(11,26,18,.98), rgba(5,8,6,.98))",
          borderLeft: "1px solid rgba(255,215,106,.3)",
          boxShadow: "-16px 0 60px rgba(0,0,0,.7), 0 0 40px rgba(86,255,118,.08)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-xl gold-shimmer tracking-[.2em]">{t("menu.title")}</div>
          <button onClick={() => { tap(); onClose(); }}
            className="grid h-9 w-9 place-items-center rounded-full glass-card active:scale-95 transition">
            <X className="h-4 w-4" style={{ color: "#FFD76A" }}/>
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const label = t(`menu.${it.key}`);
            const cls =
              "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition active:scale-[.98] hover:-translate-y-0.5";
            const style = it.danger
              ? { border: "1px solid rgba(255,118,118,.3)", background: "rgba(30,10,10,.6)", color: "#FF9F9F" }
              : { border: "1px solid rgba(255,215,106,.15)", background: "rgba(5,8,6,.5)", color: "white" };
            const inner = (
              <>
                <span className="grid h-9 w-9 place-items-center rounded-lg"
                  style={{ background: "rgba(11,26,18,.9)", border: "1px solid rgba(255,215,106,.25)" }}>
                  <Icon className="h-4 w-4" style={{ color: it.danger ? "#FF7676" : "#56FF76" }}/>
                </span>
                <span className="flex-1 text-left">{label}</span>
                <ChevronRight className="h-4 w-4 opacity-60"
                  style={{ color: it.danger ? "#FF7676" : "#FFD76A" }}/>
              </>
            );
            if (it.to) {
              return (
                <Link key={it.key} to={it.to} onClick={() => handle(it)} className={cls} style={style}>
                  {inner}
                </Link>
              );
            }
            return (
              <button key={it.key} onClick={() => handle(it)} className={cls} style={style}>
                {inner}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 text-center text-[10px] tracking-[.3em] gold-text opacity-70">
          ID·SPACE FINANCE · v2.0.0
        </div>
      </aside>
    </div>
  );
}

/** Full settings dialog (opened from Menu > Settings). */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const tap = useTap();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const pickLang = (l: Lang) => { tap(); s.set("lang", l); toast.success(s.t("settings.saved")); };
  const pickCurrency = (c: Currency) => { tap(); s.set("currency", c); toast.success(s.t("settings.saved")); };

  const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <button onClick={() => { tap(); onChange(); }}
      className="relative h-6 w-11 rounded-full transition"
      style={{
        background: on ? "linear-gradient(90deg,#56FF76,#FFD76A)" : "rgba(255,255,255,.15)",
        boxShadow: on ? "0 0 12px rgba(86,255,118,.5)" : undefined,
      }}
      aria-pressed={on}
    >
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-black transition-transform"
        style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}/>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[80] animate-fade-in">
      <div className="absolute inset-0" onClick={onClose}
        style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)" }}/>
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl sm:inset-y-4 sm:my-auto sm:rounded-2xl animate-scale-in"
        style={{
          background: "linear-gradient(180deg, rgba(11,26,18,.98), rgba(5,8,6,.98))",
          border: "1px solid rgba(255,215,106,.3)",
          boxShadow: "0 24px 80px rgba(0,0,0,.7), 0 0 40px rgba(86,255,118,.15)",
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 backdrop-blur-md"
          style={{ background: "rgba(5,8,6,.85)", borderBottom: "1px solid rgba(255,215,106,.2)" }}>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" style={{ color: "#FFD76A" }}/>
            <div className="font-display tracking-[.2em] gold-shimmer">{s.t("settings.title")}</div>
          </div>
          <button onClick={() => { tap(); onClose(); }}
            className="grid h-9 w-9 place-items-center rounded-full glass-card active:scale-95 transition">
            <X className="h-4 w-4" style={{ color: "#FFD76A" }}/>
          </button>
        </div>

        <div className="space-y-5 p-4">
          {/* Language — 12 languages in a scrollable grid */}
          <section>
            <SectionLabel icon={<Globe className="h-4 w-4"/>} title={s.t("settings.language")}/>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LANGS.map((l) => {
                const active = s.lang === l.code;
                return (
                  <button key={l.code} onClick={() => pickLang(l.code)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white transition active:scale-[.97]"
                    style={{
                      background: active ? "linear-gradient(90deg, rgba(86,255,118,.18), rgba(255,215,106,.08))" : "rgba(5,8,6,.6)",
                      border: `1px solid ${active ? "rgba(255,215,106,.6)" : "rgba(255,215,106,.18)"}`,
                      boxShadow: active ? "0 0 14px rgba(86,255,118,.2)" : undefined,
                    }}>
                    <span className="text-base">{l.flag}</span>
                    <span className="flex-1 text-left text-xs">{l.name}</span>
                    {active && <Check className="h-4 w-4 shrink-0" style={{ color: "#56FF76" }}/>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Currency */}
          <section>
            <SectionLabel icon={<DollarSign className="h-4 w-4"/>} title={s.t("settings.currency")}/>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CURRENCIES.map((c) => {
                const active = s.currency === c.code;
                return (
                  <button key={c.code} onClick={() => pickCurrency(c.code)}
                    className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-2.5 text-sm text-white transition active:scale-[.97]"
                    style={{
                      background: active ? "linear-gradient(180deg, rgba(255,215,106,.18), rgba(86,255,118,.08))" : "rgba(5,8,6,.6)",
                      border: `1px solid ${active ? "rgba(255,215,106,.6)" : "rgba(255,215,106,.18)"}`,
                      boxShadow: active ? "0 0 14px rgba(255,215,106,.25)" : undefined,
                    }}>
                    <span className="text-lg gold-text">{c.symbol}</span>
                    <span className="text-[11px] tracking-widest">{c.code}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Preferences */}
          <section>
            <SectionLabel icon={<SettingsIcon className="h-4 w-4"/>} title="Preferences"/>
            <div className="space-y-2">
              <Row icon={<Moon className="h-4 w-4"/>} label={s.t("settings.theme")}
                right={<span className="text-xs gold-text">{s.t("settings.theme.dark")}</span>}/>
              <Row icon={<Volume2 className="h-4 w-4"/>} label={s.t("settings.sound")}
                right={<Toggle on={s.sound} onChange={() => s.set("sound", !s.sound)}/>}/>
              <Row icon={<Vibrate className="h-4 w-4"/>} label={s.t("settings.haptic")}
                right={<Toggle on={s.haptic} onChange={() => s.set("haptic", !s.haptic)}/>}/>
              <Row icon={<RefreshCw className="h-4 w-4"/>} label={s.t("settings.autoRefresh")}
                right={<Toggle on={s.autoRefresh} onChange={() => s.set("autoRefresh", !s.autoRefresh)}/>}/>
              <Row icon={<Bell className="h-4 w-4"/>} label={s.t("settings.notifications")}
                right={<Toggle on={s.notifications} onChange={() => s.set("notifications", !s.notifications)}/>}/>
            </div>
          </section>

          {/* Legal */}
          <section>
            <SectionLabel icon={<Shield className="h-4 w-4"/>} title="Legal"/>
            <div className="space-y-2">
              {[
                { icon: <Shield className="h-4 w-4"/>, label: s.t("settings.privacy"), to: "/privacy" },
                { icon: <FileText className="h-4 w-4"/>, label: s.t("settings.terms"), to: "/terms" },
                { icon: <Info className="h-4 w-4"/>, label: s.t("settings.about"), to: "/profile" },
              ].map((r) => {
                const inner = (
                  <>
                    <span style={{ color: "#56FF76" }}>{r.icon}</span>
                    <span className="flex-1 text-left">{r.label}</span>
                    <ChevronRight className="h-4 w-4" style={{ color: "#FFD76A" }}/>
                  </>
                );
                const cls = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white transition active:scale-[.98]";
                const style = { background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" };
                return r.to ? (
                  <Link key={r.label} to={r.to} onClick={() => { tap(); onClose(); }} className={cls} style={style}>{inner}</Link>
                ) : (
                  <button key={r.label} onClick={() => { tap(); toast(s.t("toast.comingSoon")); }} className={cls} style={style}>{inner}</button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span style={{ color: "#56FF76" }}>{icon}</span>
      <h3 className="text-[11px] font-semibold uppercase tracking-[.3em] gold-text">{title}</h3>
    </div>
  );
}

function Row({ icon, label, right }: { icon: React.ReactNode; label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3"
      style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}>
      <span style={{ color: "#56FF76" }}>{icon}</span>
      <span className="flex-1 text-sm text-white">{label}</span>
      {right}
    </div>
  );
}
