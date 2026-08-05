import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownUp, Copy, History, RefreshCw, Sparkles,
  TrendingDown, TrendingUp, Wifi, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionTitle } from "@/components/idspace/shell";
import { useIdpointsBalance, useSwapHistory } from "@/lib/idpoints-store";
import { useMarket, refreshMarket } from "@/lib/market-store";

export const Route = createFileRoute("/swap")({
  component: SwapPage,
  head: () => ({
    meta: [
      { title: "Swap Center — IDPI" },
      { name: "description", content: "Convert IDPoints, IDR, PI and USD in real time with live market rates." },
    ],
  }),
});

type Ccy = "IDPOINTS" | "IDR" | "PI" | "USD";
const CCYS: Ccy[] = ["IDPOINTS", "IDR", "PI", "USD"];
const IDPOINTS_PER_IDR = 9;

const LABEL: Record<Ccy, string> = {
  IDPOINTS: "IDPoints", IDR: "IDR", PI: "PI", USD: "USD",
};
const SYM: Record<Ccy, string> = {
  IDPOINTS: "◈", IDR: "Rp", PI: "π", USD: "$",
};
const COLOR: Record<Ccy, string> = {
  IDPOINTS: "#FFD76A", IDR: "#FF7676", PI: "#7CC3FF", USD: "#56FF76",
};

type Rates = {
  piUsd: number; usdIdr: number;
};

/* ---- Conversion core ---- */
function toUsd(amount: number, ccy: Ccy, r: Rates): number {
  if (!isFinite(amount)) return 0;
  switch (ccy) {
    case "USD": return amount;
    case "PI": return amount * r.piUsd;
    case "IDR": return r.usdIdr > 0 ? amount / r.usdIdr : 0;
    case "IDPOINTS": return r.usdIdr > 0 ? (amount / IDPOINTS_PER_IDR) / r.usdIdr : 0;
  }
}
function fromUsd(usd: number, ccy: Ccy, r: Rates): number {
  switch (ccy) {
    case "USD": return usd;
    case "PI": return r.piUsd > 0 ? usd / r.piUsd : 0;
    case "IDR": return usd * r.usdIdr;
    case "IDPOINTS": return usd * r.usdIdr * IDPOINTS_PER_IDR;
  }
}
function convert(amount: number, from: Ccy, to: Ccy, r: Rates): number {
  if (from === to) return amount;
  return fromUsd(toUsd(amount, from, r), to, r);
}
function digitsFor(ccy: Ccy) {
  if (ccy === "PI") return 8;
  if (ccy === "IDPOINTS" || ccy === "IDR") return 0;
  return 2;
}
function fmt(n: number, ccy: Ccy) {
  if (!isFinite(n)) return "0";
  const d = digitsFor(ccy);
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function SwapPage() {
  const market = useMarket();
  const rates: Rates = { piUsd: market.piUsd, usdIdr: market.usdIdr };

  const [from, setFrom] = useState<Ccy>("IDPOINTS");
  const [to, setTo] = useState<Ccy>("IDR");
  const [amount, setAmount] = useState("9000");

  const { balance } = useIdpointsBalance();
  const { items: history, add: addHistory, clear: clearHistory } = useSwapHistory();

  const parsed = useMemo(() => parseFloat(amount.replace(/,/g, "")) || 0, [amount]);
  const result = useMemo(() => convert(parsed, from, to, rates), [parsed, from, to, rates]);

  const reverse = () => { setFrom(to); setTo(from); setAmount(String(result || 0)); };

  const useMax = () => {
    if (from === "IDPOINTS") setAmount(String(balance || 0));
    else if (from === "IDR") setAmount(String(Math.floor(balance / IDPOINTS_PER_IDR)));
    else toast(`Max is only available for IDPoints/IDR`);
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(fmt(result, to));
      toast.success("Copied");
    } catch { toast.error("Copy failed"); }
  };

  const recordSwap = () => {
    if (parsed <= 0) return;
    if (from === "IDPOINTS" && parsed > balance) {
      toast.error("Insufficient IDPoints balance");
      return;
    }
    addHistory({ from, to, amount: parsed, result });
    toast.success(`Swap: ${fmt(parsed, from)} ${LABEL[from]} → ${fmt(result, to)} ${LABEL[to]}`);
  };

  const priceColor = market.change24h >= 0 ? "#56FF76" : "#FF7676";
  const flashColor = market.flash === "up" ? "#56FF76" : market.flash === "down" ? "#FF7676" : "transparent";
  const { loading, online, updatedAt: updated } = market;
  const fetchRates = refreshMarket;

  return (
    <AppShell active="swap">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Swap</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">Swap Center</h1>
          <p className="mt-2 text-xs text-emerald-100/60">
            IDPoints is the in-app currency. Fixed rate: <span className="gold-text">9 IDPoints = Rp1</span>
          </p>
        </div>

        {/* Market panel */}
        <div className="glass-card p-4 lg:p-5 mb-4">
          <SectionTitle
            icon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
            title="PI MARKET"
            right={
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] ${online ? "gold-border gold-text" : ""}`}
                    style={online ? undefined : { border: "1px solid rgba(255,118,118,.4)", color: "#FF7676" }}>
                {online ? <Wifi className="h-3 w-3"/> : <WifiOff className="h-3 w-3"/>}
                {online ? "Live" : "Offline (cached)"}
              </span>
            }
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MarketStat label="PI Price" value={`$${market.piUsd.toFixed(6)}`}
                        highlightColor={flashColor} />
            <MarketStat label="24H Change"
              icon={market.change24h >= 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>}
              value={`${market.change24h >= 0 ? "+" : ""}${market.change24h.toFixed(2)}%`}
              color={priceColor}/>
            <MarketStat label="High 24H" value={`$${market.high24h.toFixed(6)}`}/>
            <MarketStat label="Low 24H" value={`$${market.low24h.toFixed(6)}`}/>
            <MarketStat label="Volume" value={market.vol24h.toLocaleString("en-US", { maximumFractionDigits: 0 })}/>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-100/70">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" style={{ color: "#FFD76A" }}/>
              OKX · PI/USDT · USD/IDR
            </span>
            <button
              onClick={fetchRates}
              className="flex items-center gap-1 rounded-full gold-border px-2 py-1 gold-text transition hover:-translate-y-0.5"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}/>
              Updated {updated}
            </button>
          </div>
        </div>

        {/* Swap panel */}
        <div className="glass-card p-4 lg:p-5">
          <SectionTitle
            icon={<ArrowDownUp className="h-4 w-4"/>} title="SWAP"
            right={<span className="text-[11px] text-emerald-100/60">Balance: <span className="gold-text">{fmt(balance, "IDPOINTS")}</span> IDPoints</span>}
          />

          <SidePanel side="from" ccy={from} setCcy={setFrom} amount={amount} setAmount={setAmount} onMax={useMax}/>

          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute left-0 right-0 h-px" style={{ background: "rgba(255,215,106,.2)" }}/>
            <button
              onClick={reverse}
              className="relative grid h-10 w-10 place-items-center rounded-full gold-border transition active:scale-95 hover:-translate-y-0.5"
              style={{ background: "rgba(11,26,18,.95)" }}
              aria-label="Reverse"
            >
              <ArrowDownUp className="h-4 w-4" style={{ color: "#FFD76A" }}/>
            </button>
          </div>

          <SidePanel side="to" ccy={to} setCcy={setTo} amount={fmt(result, to)} readOnly flashColor={flashColor}/>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={copyResult}
              className="flex items-center gap-2 rounded-lg gold-border px-3 py-2 text-xs gold-text transition hover:-translate-y-0.5"
            >
              <Copy className="h-3.5 w-3.5"/> Copy result
            </button>
            <button
              onClick={recordSwap}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-black transition active:scale-95 anim-pulse-glow"
              style={{
                background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                backgroundSize: "200% 100%",
                animation: "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite",
              }}
            >
              <Sparkles className="h-4 w-4"/> Confirm Swap
            </button>
          </div>
        </div>

        {/* History */}
        <div className="glass-card p-4 lg:p-5 mt-4">
          <SectionTitle
            icon={<History className="h-4 w-4"/>} title="SWAP HISTORY"
            right={history.length ? (
              <button onClick={clearHistory} className="text-[11px] gold-text hover:underline">Clear</button>
            ) : null}
          />
          {history.length === 0 ? (
            <div className="rounded-lg p-4 text-center text-xs text-emerald-100/50"
                 style={{ background: "rgba(5,8,6,.5)", border: "1px dashed rgba(255,215,106,.2)" }}>
              No swaps yet. Confirm a swap to log it here.
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="font-mono text-white">
                    {fmt(h.amount, h.from as Ccy)} <span style={{ color: COLOR[h.from as Ccy] }}>{LABEL[h.from as Ccy]}</span>
                    <span className="mx-2 text-emerald-100/40">→</span>
                    {fmt(h.result, h.to as Ccy)} <span style={{ color: COLOR[h.to as Ccy] }}>{LABEL[h.to as Ccy]}</span>
                  </span>
                  <span className="text-emerald-100/50">{new Date(h.at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function MarketStat({
  label, value, color, icon, highlightColor,
}: {
  label: string; value: string; color?: string; icon?: React.ReactNode; highlightColor?: string;
}) {
  return (
    <div className="rounded-xl p-3 transition"
         style={{
           background: "rgba(5,8,6,.6)",
           border: `1px solid ${highlightColor && highlightColor !== "transparent" ? highlightColor : "rgba(255,215,106,.15)"}`,
           boxShadow: highlightColor && highlightColor !== "transparent" ? `0 0 12px ${highlightColor}` : undefined,
         }}>
      <div className="text-[10px] uppercase tracking-widest text-emerald-100/50">{label}</div>
      <div className="mt-1 flex items-center gap-1 font-mono text-sm font-bold" style={{ color: color ?? "#FFD76A" }}>
        {icon} {value}
      </div>
    </div>
  );
}

function SidePanel({
  side, ccy, setCcy, amount, setAmount, readOnly, onMax, flashColor,
}: {
  side: "from" | "to";
  ccy: Ccy;
  setCcy?: (c: Ccy) => void;
  amount: string;
  setAmount?: (v: string) => void;
  readOnly?: boolean;
  onMax?: () => void;
  flashColor?: string;
}) {
  const border = side === "from" ? "rgba(255,215,106,.28)" : "rgba(86,255,118,.35)";
  const glow = side === "from" ? undefined : "0 0 18px rgba(86,255,118,.10)";
  const highlight = flashColor && flashColor !== "transparent" ? { boxShadow: `0 0 20px ${flashColor}` } : {};
  return (
    <div className="rounded-xl p-3"
         style={{ background: "rgba(5,8,6,.6)", border: `1px solid ${border}`, boxShadow: glow, ...highlight }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-emerald-100/60">
          {side === "from" ? "You send" : "You receive"}
        </span>
        {onMax && (
          <button onClick={onMax} className="rounded-full px-2 py-0.5 text-[10px] gold-border gold-text hover:-translate-y-0.5 transition">
            MAX
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full font-bold"
              style={{ border: `1.5px solid ${COLOR[ccy]}`, color: COLOR[ccy] }}>
          {SYM[ccy]}
        </span>
        {readOnly ? (
          <div className="flex-1 font-mono text-xl" style={{ color: COLOR[ccy] }}>{amount}</div>
        ) : (
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount?.(e.target.value.replace(/[^\d.,]/g, ""))}
            className="flex-1 bg-transparent font-mono text-xl text-white outline-none"
            placeholder="0.00"
          />
        )}
        <select
          value={ccy}
          onChange={(e) => setCcy?.(e.target.value as Ccy)}
          disabled={!setCcy}
          className="rounded-lg px-2 py-1.5 text-xs text-white outline-none"
          style={{ background: "rgba(5,8,6,.9)", border: "1px solid rgba(255,215,106,.35)" }}
        >
          {CCYS.map((c) => (
            <option key={c} value={c} style={{ background: "#050806" }}>
              {LABEL[c]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}