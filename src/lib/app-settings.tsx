import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

export type Lang = "id" | "en" | "ko" | "zh" | "hi" | "ar";
export type Currency = "PI" | "IDR" | "USD" | "EUR" | "KRW" | "CNY" | "INR" | "SAR";

export const LANGS: { code: Lang; flag: string; name: string; short: string }[] = [
  { code: "id", flag: "🇮🇩", name: "Indonesia", short: "ID" },
  { code: "en", flag: "🇺🇸", name: "English", short: "EN" },
  { code: "ko", flag: "🇰🇷", name: "한국어", short: "KO" },
  { code: "zh", flag: "🇨🇳", name: "简体中文", short: "ZH" },
  { code: "hi", flag: "🇮🇳", name: "हिन्दी", short: "HI" },
  { code: "ar", flag: "🇸🇦", name: "العربية", short: "AR" },
];

export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "PI",  symbol: "π",  label: "Pi Network" },
  { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah" },
  { code: "USD", symbol: "$",  label: "US Dollar" },
  { code: "EUR", symbol: "€",  label: "Euro" },
  { code: "KRW", symbol: "₩",  label: "Korean Won" },
  { code: "CNY", symbol: "¥",  label: "Chinese Yuan" },
  { code: "INR", symbol: "₹",  label: "Indian Rupee" },
  { code: "SAR", symbol: "﷼",  label: "Saudi Riyal" },
];

/* USD → target rates (fiat approximations; PI is live from PiConverter). */
export const USD_RATES: Record<Exclude<Currency, "PI">, number> = {
  USD: 1, IDR: 16258, EUR: 0.92, KRW: 1370, CNY: 7.22, INR: 83.4, SAR: 3.75,
};
/* Fallback live PI/USD used when converter has not fetched yet. */
let LAST_PI_USD = 0.642135;
export function setLivePiUsd(v: number) { if (isFinite(v) && v > 0) LAST_PI_USD = v; }
export function getLivePiUsd() { return LAST_PI_USD; }

/* Minimal i18n dictionary. Keys are stable ids; unknown keys fall back to English or the key. */
type Dict = Record<string, string>;
const T: Record<Lang, Dict> = {
  en: {
    "nav.home": "Home", "nav.market": "Market", "nav.play": "Play",
    "nav.assets": "Assets", "nav.alerts": "Alerts", "nav.menu": "Menu",
    "menu.title": "Menu", "menu.close": "Close",
    "menu.home": "Home", "menu.marketplace": "Marketplace", "menu.play": "Play",
    "menu.swap": "Swap Center", "menu.checkin": "Daily Check-In",
    "menu.wallet": "Wallet", "menu.assets": "Assets", "menu.finance": "Finance",
    "menu.mining": "Mining", "menu.rewards": "Rewards", "menu.news": "News",
    "menu.staking": "Staking", "menu.premium": "Premium", "menu.rate": "Rate Us ★",
    "menu.community": "Community", "menu.history": "History",
    "menu.notifications": "Notifications", "menu.settings": "Settings",
    "menu.help": "Help Center", "menu.about": "About", "menu.logout": "Logout",
    "settings.title": "Settings", "settings.language": "Language",
    "settings.currency": "Currency", "settings.theme": "Theme",
    "settings.theme.dark": "Dark (Default)",
    "settings.sound": "Sound", "settings.haptic": "Haptic Feedback",
    "settings.autoRefresh": "Auto Refresh", "settings.notifications": "Notifications",
    "settings.privacy": "Privacy", "settings.terms": "Terms", "settings.about": "About",
    "settings.saved": "Preferences saved",
    "common.on": "On", "common.off": "Off",
    "toast.notifications": "You have no new notifications",
    "toast.viewAllNews": "Opening news feed…",
    "toast.comingSoon": "Coming soon",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · All Rights Reserved",
  },
  id: {
    "nav.home": "Beranda", "nav.market": "Pasar", "nav.play": "Main",
    "nav.assets": "Aset", "nav.alerts": "Notifikasi", "nav.menu": "Menu",
    "menu.title": "Menu", "menu.close": "Tutup",
    "menu.home": "Beranda", "menu.marketplace": "Marketplace", "menu.play": "Hiburan",
    "menu.swap": "Pusat Swap", "menu.checkin": "Check-In Harian",
    "menu.wallet": "Dompet", "menu.assets": "Aset", "menu.finance": "Finansial",
    "menu.mining": "Mining", "menu.rewards": "Hadiah", "menu.news": "Berita",
    "menu.staking": "Staking", "menu.premium": "Premium", "menu.rate": "Beri Rating ★",
    "menu.community": "Komunitas", "menu.history": "Riwayat",
    "menu.notifications": "Notifikasi", "menu.settings": "Pengaturan",
    "menu.help": "Pusat Bantuan", "menu.about": "Tentang", "menu.logout": "Keluar",
    "settings.title": "Pengaturan", "settings.language": "Bahasa",
    "settings.currency": "Mata Uang", "settings.theme": "Tema",
    "settings.theme.dark": "Gelap (Default)",
    "settings.sound": "Suara", "settings.haptic": "Getaran",
    "settings.autoRefresh": "Auto Refresh", "settings.notifications": "Notifikasi",
    "settings.privacy": "Privasi", "settings.terms": "Syarat", "settings.about": "Tentang",
    "settings.saved": "Preferensi tersimpan",
    "common.on": "Aktif", "common.off": "Mati",
    "toast.notifications": "Belum ada notifikasi baru",
    "toast.viewAllNews": "Membuka berita…",
    "toast.comingSoon": "Segera hadir",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · Hak Cipta Dilindungi",
  },
  ko: {
    "nav.home": "홈", "nav.market": "마켓", "nav.play": "플레이",
    "nav.assets": "자산", "nav.alerts": "알림", "nav.menu": "메뉴",
    "menu.title": "메뉴", "menu.settings": "설정", "menu.logout": "로그아웃",
    "settings.title": "설정", "settings.language": "언어", "settings.currency": "통화",
  },
  zh: {
    "nav.home": "首页", "nav.market": "市场", "nav.play": "娱乐",
    "nav.assets": "资产", "nav.alerts": "通知", "nav.menu": "菜单",
    "menu.title": "菜单", "menu.settings": "设置", "menu.logout": "退出",
    "settings.title": "设置", "settings.language": "语言", "settings.currency": "货币",
  },
  hi: {
    "nav.home": "होम", "nav.market": "बाज़ार", "nav.play": "प्ले",
    "nav.assets": "एसेट्स", "nav.alerts": "अलर्ट", "nav.menu": "मेनू",
    "menu.title": "मेनू", "menu.settings": "सेटिंग्स", "menu.logout": "लॉगआउट",
    "settings.title": "सेटिंग्स", "settings.language": "भाषा", "settings.currency": "मुद्रा",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.market": "السوق", "nav.play": "ترفيه",
    "nav.assets": "الأصول", "nav.alerts": "التنبيهات", "nav.menu": "القائمة",
    "menu.title": "القائمة", "menu.settings": "الإعدادات", "menu.logout": "خروج",
    "settings.title": "الإعدادات", "settings.language": "اللغة", "settings.currency": "العملة",
  },
};

type Settings = {
  lang: Lang;
  currency: Currency;
  sound: boolean;
  haptic: boolean;
  autoRefresh: boolean;
  notifications: boolean;
};

const DEFAULT: Settings = {
  lang: "id", currency: "IDR", sound: true, haptic: true,
  autoRefresh: true, notifications: true,
};

type Ctx = Settings & {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  t: (key: string) => string;
  fmt: (usd: number) => string;   // formats a USD amount into current currency
  convert: (usd: number) => number;
  symbol: string;
  playClick: () => void;
  tapHaptic: () => void;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("idspace.settings");
      if (raw) setS({ ...DEFAULT, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((next: Settings) => {
    setS(next);
    try { localStorage.setItem("idspace.settings", JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    persist({ ...s, [key]: value });
  }, [s, persist]);

  const t = useCallback((key: string) => {
    return T[s.lang]?.[key] ?? T.en[key] ?? key;
  }, [s.lang]);

  const convert = useCallback((usd: number) => {
    if (s.currency === "PI") {
      const p = getLivePiUsd();
      return p > 0 ? usd / p : 0;
    }
    return usd * USD_RATES[s.currency];
  }, [s.currency]);

  const symbol = useMemo(
    () => CURRENCIES.find(c => c.code === s.currency)?.symbol ?? "$",
    [s.currency]
  );

  const fmt = useCallback((usd: number) => {
    const v = convert(usd);
    const digits = s.currency === "IDR" || s.currency === "KRW" ? 0
      : s.currency === "PI" ? 4 : 2;
    return `${symbol}${v.toLocaleString("en-US", {
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    })}`;
  }, [convert, s.currency, symbol]);

  const playClick = useCallback(() => {
    if (!s.sound || typeof window === "undefined") return;
    try {
      const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.value = 0.03;
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.06);
      setTimeout(() => ctx.close(), 120);
    } catch { /* ignore */ }
  }, [s.sound]);

  const tapHaptic = useCallback(() => {
    if (!s.haptic || typeof navigator === "undefined") return;
    if ("vibrate" in navigator) navigator.vibrate?.(8);
  }, [s.haptic]);

  const value = useMemo<Ctx>(() => ({
    ...s, set, t, fmt, convert, symbol, playClick, tapHaptic,
  }), [s, set, t, fmt, convert, symbol, playClick, tapHaptic]);

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error("useSettings must be used within <SettingsProvider>");
  return v;
}

/** Convenience hook: call `tap()` inside any onClick to run haptic + sound. */
export function useTap() {
  const { playClick, tapHaptic } = useSettings();
  return useCallback(() => { tapHaptic(); playClick(); }, [playClick, tapHaptic]);
}