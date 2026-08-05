import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, RefreshCw, Sparkles } from "lucide-react";
import { SectionTitle } from "@/components/idspace/shell";
import { setLivePiUsd } from "@/lib/app-settings";

/**
 * Dynamic single-column Pi Converter.
 * Live PI/USDT price from OKX public market API.
 * Fiat cross-rates (IDR, EUR, KRW, CNY, INR, SAR) derived from a
 * lightweight base table against USD; PI leg is always live.
 */

type Ccy = "PI" | "USD" | "IDR" | "EUR" | "KRW" | "CNY" | "INR" | "SAR";

const SYMBOL: Record<Ccy, string> = {
  PI: "π", USD: "$", IDR: "Rp", EUR: "€", KRW: "₩", CNY: "¥", INR: "₹", SAR: "﷼",
};

const COLOR: Record<Ccy, string> = {
  PI: "#FFD76A", USD: "#56FF76", IDR: "#FF7676", EUR: "#7CC3FF",
  KRW: "#C7A6FF", CNY: "#FF9F76", INR: "#FFB86A", SAR: "#56FFB6",
};

// Approximate USD→X (used as fallback + fiat legs). Only PI leg is live.
const USD_TO: Record<Exclude<Ccy, "PI">, number> = {
  USD: 1, IDR: 19906, EUR: 0.92, KRW: 1370, CNY: 7.22, INR: 83.4, SAR: 3.75,
};

const PAIRS: Array<{ from: Ccy; to: Ccy }> = [
  { from: "PI", to: "USD" },
  { from: "PI", to: "IDR" },
  { from: "PI", to: "EUR" },
  { from: "PI", to: "KRW" },
  { from: "PI", to: "CNY" },
  { from: "PI", to: "INR" },
  { from: "PI", to: "SAR" },
  { from: "USD", to: "PI" },
  { from: "IDR", to: "PI" },
  { from: "EUR", to: "PI" },
  { from: "USD", to: "IDR" },
  { from: "IDR", to: "USD" },
];

function fmt(n: number, digits = 8) {
  if (!isFinite(n)) return "0.00000000";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function toUsd(amount: number, ccy: Ccy, piUsd: number): number {
  if (ccy === "PI") return amount * piUsd;
  return amount / USD_TO[ccy];
}
function fromUsd(usd: number, ccy: Ccy, piUsd: number): number {
  if (ccy === "PI") return piUsd > 0 ? usd / piUsd : 0;
  return usd * USD_TO[ccy];
}

export function PiConverter() {
  const [pairIdx, setPairIdx] = useState(0);
  const [amount, setAmount] = useState<string>("1");
  const [piUsd, setPiUsd] = useState<number>(0.089135);
  const [updated, setUpdated] = useState<string>("--:--:--");
  const [loading, setLoading] = useState(false);

  const pair = PAIRS[pairIdx];

  const fetchPrice = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://www.okx.com/api/v5/market/ticker?instId=PI-USDT");
      const j = await res.json();
      const last = parseFloat(j?.data?.[0]?.last);
      if (isFinite(last) && last > 0) { setPiUsd(last); setLivePiUsd(last); }
      setUpdated(new Date().toTimeString().slice(0, 8));
    } catch {
      setUpdated(new Date().toTimeString().slice(0, 8));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    const t = setInterval(fetchPrice, 30000);
    return () => clearInterval(t);
  }, []);

  const result = useMemo(() => {
    const n = parseFloat(amount.replace(/,/g, "")) || 0;
    return fromUsd(toUsd(n, pair.from, piUsd), pair.to, piUsd);
  }, [amount, pair, piUsd]);

  const swap = () => {
    const swapped = PAIRS.findIndex(p => p.from === pair.to && p.to === pair.from);
    if (swapped >= 0) setPairIdx(swapped);
  };

  return (
    <div className="glass-card p-4 lg:p-5">
      <SectionTitle
        icon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
        title="PI CONVERTER"
        right={
          <span className="rounded-full gold-border px-3 py-1 text-[11px] gold-text">
            High Precision (8 Decimals)
          </span>
        }
      />

      {/* Pair selector */}
      <div className="mb-3 flex items-center gap-2">
        <label className="text-[10px] uppercase tracking-widest text-emerald-100/60">Pair</label>
        <div className="relative flex-1">
          <select
            value={pairIdx}
            onChange={(e) => setPairIdx(parseInt(e.target.value, 10))}
            className="w-full appearance-none rounded-lg px-3 py-2 pr-8 text-sm text-white outline-none"
            style={{
              background: "rgba(5,8,6,.75)",
              border: "1px solid rgba(255,215,106,.35)",
              boxShadow: "inset 0 0 10px rgba(86,255,118,.08)",
            }}
          >
            {PAIRS.map((p, i) => (
              <option key={`${p.from}-${p.to}`} value={i} style={{ background: "#050806" }}>
                {p.from} → {p.to}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 gold-text text-xs">▾</span>
        </div>
        <button
          onClick={swap}
          className="grid h-9 w-9 place-items-center rounded-full gold-border"
          style={{ background: "rgba(11,26,18,.9)" }}
          aria-label="Swap"
        >
          <ArrowLeftRight className="h-4 w-4" style={{ color: "#FFD76A" }} />
        </button>
      </div>

      {/* From */}
      <div className="rounded-xl p-3"
        style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.2)" }}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-emerald-100/60">You send</span>
          <span className="text-[11px] gold-text">{pair.from}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full font-bold"
            style={{ border: "1.5px solid rgba(255,215,106,.7)", color: COLOR[pair.from] }}>
            {SYMBOL[pair.from]}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            className="flex-1 bg-transparent font-mono text-xl text-white outline-none"
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="my-2 text-center text-xs text-emerald-200/70">=</div>

      {/* To */}
      <div className="rounded-xl p-3"
        style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(86,255,118,.28)",
          boxShadow: "0 0 18px rgba(86,255,118,.1)" }}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-emerald-100/60">You receive</span>
          <span className="text-[11px]" style={{ color: "#56FF76" }}>{pair.to}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full font-bold"
            style={{ border: "1.5px solid rgba(86,255,118,.6)", color: COLOR[pair.to] }}>
            {SYMBOL[pair.to]}
          </span>
          <div className="flex-1 font-mono text-xl emerald-text">{fmt(result)}</div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="flex items-center gap-1 text-emerald-100/70">
          <Sparkles className="h-3 w-3" style={{ color: "#FFD76A" }} />
          Source: OKX · PI/USDT
        </span>
        <span className="text-emerald-100/70">
          1 PI = <span className="gold-text">${piUsd.toFixed(6)}</span>
        </span>
        <button
          onClick={fetchPrice}
          className="flex items-center gap-1 rounded-full gold-border px-2 py-1 gold-text hover:-translate-y-0.5 transition"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {updated}
        </button>
      </div>
    </div>
  );
}

export default PiConverter;
