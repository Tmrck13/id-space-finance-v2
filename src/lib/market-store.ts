/**
 * Global live-market store shared by the Home dashboard, Swap Center,
 * and any future page that needs PI market data. Guarantees that all
 * consumers show identical values.
 *
 * Data source: /api/public/rates (server-proxied OKX + open.er-api.com).
 * Refresh cadence: 60s while any subscriber is mounted.
 */

import { useSyncExternalStore } from "react";
import { setLivePiUsd } from "@/lib/app-settings";

export type MarketRates = {
  ok: boolean;
  piUsd: number;
  usdIdr: number;
  change24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  ts: number;
  updatedAt: string;   // hh:mm:ss
  online: boolean;
  loading: boolean;
  flash: "up" | "down" | "none";
};

const CACHE_KEY = "idpi.rates.cache";
const FALLBACK: MarketRates = {
  ok: false,
  piUsd: 0.642135,
  usdIdr: 16258,
  change24h: 0, high24h: 0, low24h: 0, vol24h: 0,
  ts: 0, updatedAt: "--:--:--",
  online: false, loading: false, flash: "none",
};

let STATE: MarketRates = FALLBACK;
let lastPi = 0;
let started = false;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }
function set(patch: Partial<MarketRates>) {
  STATE = { ...STATE, ...patch };
  emit();
}

function loadCache() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const c = JSON.parse(raw) as MarketRates;
    if (c?.piUsd > 0) {
      STATE = {
        ...FALLBACK, ...c,
        updatedAt: c.ts ? new Date(c.ts).toTimeString().slice(0, 8) : "--:--:--",
        online: false, loading: false, flash: "none",
      };
      lastPi = c.piUsd;
      setLivePiUsd(c.piUsd);
    }
  } catch { /* ignore */ }
}

export async function refreshMarket() {
  set({ loading: true });
  try {
    const res = await fetch("/api/public/rates", { cache: "no-store" });
    const j = (await res.json()) as Partial<MarketRates>;
    if (typeof j.piUsd === "number" && j.piUsd > 0 && typeof j.usdIdr === "number" && j.usdIdr > 0) {
      const prev = lastPi || j.piUsd;
      const flash: MarketRates["flash"] =
        j.piUsd > prev ? "up" : j.piUsd < prev ? "down" : "none";
      lastPi = j.piUsd;
      setLivePiUsd(j.piUsd);
      const ts = j.ts ?? Date.now();
      const next: MarketRates = {
        ok: true,
        piUsd: j.piUsd, usdIdr: j.usdIdr,
        change24h: j.change24h ?? 0,
        high24h: j.high24h ?? 0,
        low24h: j.low24h ?? 0,
        vol24h: j.vol24h ?? 0,
        ts, updatedAt: new Date(ts).toTimeString().slice(0, 8),
        online: true, loading: false, flash,
      };
      STATE = next;
      emit();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      setTimeout(() => { if (STATE.flash !== "none") set({ flash: "none" }); }, 900);
    } else {
      set({ online: false, loading: false });
    }
  } catch {
    set({ online: false, loading: false });
  }
}

function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  loadCache();
  refreshMarket();
  timer = setInterval(refreshMarket, 60_000);
}

function subscribe(cb: () => void) {
  ensureStarted();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      started = false;
    }
  };
}

export function useMarket(): MarketRates {
  return useSyncExternalStore(subscribe, () => STATE, () => STATE);
}