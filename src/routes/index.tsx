import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Coins, Pickaxe, Moon,
  LineChart as LineChartIcon, Gift,
  BarChart3, RefreshCw, LayoutGrid, ChevronRight,
  CheckCircle2, Users, Newspaper, Send, CreditCard, ShoppingCart,
  ArrowLeftRight, TrendingUp, TrendingDown, Crown, Trophy, Sparkles,
  PlayCircle,
} from "lucide-react";
import heroMosque from "@/assets/hero-mosque.jpg";
import { AppShell, GoldRing, HexIcon, SectionTitle } from "@/components/idspace/shell";
import { PiConverter } from "@/components/idspace/pi-converter";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSettings, useTap } from "@/lib/app-settings";
import { useMarket } from "@/lib/market-store";
import { useCheckin, useIdpointsBalance } from "@/lib/idpoints-store";

export const Route = createFileRoute("/")({
  component: Index,
});

/* ---------- Small helpers ---------- */
function Sparkline({ up = true, seed = 1 }: { up?: boolean; seed?: number }) {
  const pts = useMemo(() => {
    const n = 40; const arr: number[] = [];
    let v = 20 + seed;
    // Deterministic PRNG to avoid SSR/CSR hydration mismatch.
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < n; i++) {
      v += (Math.sin(i * (0.5 + seed * 0.1)) + (rnd() - 0.5)) * 2 + (up ? 0.35 : -0.35);
      arr.push(v);
    }
    return arr;
  }, [up, seed]);
  const min = Math.min(...pts), max = Math.max(...pts);
  const w = 260, h = 60;
  const path = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - ((p - min) / (max - min || 1)) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const color = up ? "#56FF76" : "#FF7676";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={`url(#g-${seed})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" style={{ filter: `drop-shadow(0 0 6px ${color})` }}/>
    </svg>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="glass-card relative overflow-hidden min-h-[180px] lg:min-h-[220px]">
      <img src={heroMosque} alt="mosque" className="absolute inset-0 h-full w-full object-cover opacity-70"/>
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(5,8,6,.85), rgba(5,8,6,.2) 60%, rgba(5,8,6,.6))" }}/>
      <div className="relative p-6 lg:p-8">
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl leading-tight gold-shimmer max-w-lg">
          The First Islamic Web3<br/>Finance Super App
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {["Halal","Secure","Decentralized","For Ummah"].map((t,i)=>(
            <span key={t} className="flex items-center gap-1.5" style={{color:"#56FF76"}}>
              {i>0 && <span className="opacity-40">•</span>}{t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Panels ---------- */
function LivePiMarket() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const date = now ? now.toDateString().split(" ").slice(1).join(" ") : "";
  const { fmt } = useSettings();
  const m = useMarket();
  const piUsd = m.piUsd || 0.089135;
  const usdIdr = m.usdIdr || 19906;
  const piIdr = piUsd * usdIdr;
  const changeStr = `${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(2)}%`;
  const changeColor = m.change24h >= 0 ? "#56FF76" : "#FF7676";
  return (
    <div className="glass-card p-4 lg:p-5">
      <SectionTitle
        icon={<span className="inline-block h-2.5 w-2.5 rounded-full anim-pulse-glow" style={{background:"#56FF76"}}/>}
        title="LIVE PI MARKET"
        right={<div className="flex items-center gap-4 text-[11px] text-emerald-100/60">
          <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" style={{color:"#FFD76A"}}/>Source: OKX</span>
          <span>{m.online ? "Live · 60s" : "Offline (cached)"}</span>
        </div>}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="glass-card p-4">
          <div className="text-[11px] tracking-widest text-emerald-200/70">PI PRICE</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-semibold emerald-text">{fmt(piUsd)}</span>
            <span className="text-xs" style={{color: changeColor}}>{changeStr} {m.change24h >= 0 ? "↑" : "↓"}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div><div className="text-emerald-100/50">24H High</div><div className="text-white">{fmt(m.high24h || piUsd)}</div></div>
            <div><div className="text-emerald-100/50">24H Low</div><div className="text-white">{fmt(m.low24h || piUsd)}</div></div>
          </div>
          <Sparkline up seed={1}/>
        </div>
        <div className="glass-card p-4">
          <div className="text-[11px] tracking-widest text-emerald-200/70">PI PRICE (IDR)</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-semibold emerald-text">Rp{piIdr.toLocaleString("en-US", {maximumFractionDigits: 2})}</span>
            <span className="text-xs" style={{color: changeColor}}>{changeStr} {m.change24h >= 0 ? "↑" : "↓"}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div><div className="text-emerald-100/50">24H Volume</div><div className="text-white">{m.vol24h.toLocaleString("en-US", {maximumFractionDigits: 0})} PI</div></div>
            <div><div className="text-emerald-100/50">Market Status</div><div className="text-white">{m.online ? "Live" : "Offline"}</div></div>
          </div>
          <Sparkline up seed={2}/>
        </div>
        <div className="glass-card p-4">
          <div className="text-[11px] tracking-widest text-emerald-200/70">EXCHANGE RATE</div>
          <div className="mt-1 text-xl font-semibold gold-text">1 USD = Rp{usdIdr.toLocaleString("en-US", {maximumFractionDigits: 2})}</div>
          <div className="text-xs" style={{color: "#56FF76"}}>Live</div>
          <div className="mt-4 text-xs text-emerald-100/50">Last Updated</div>
          <div className="mt-1 flex items-center justify-between text-white">
            <span className="inline-flex items-center gap-1 text-sm"><RefreshCw className="h-3.5 w-3.5" style={{color:"#56FF76"}}/>{m.updatedAt}</span>
            <span className="text-sm">{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStats() {
  const { fmt } = useSettings();
  const m = useMarket();
  const items = [
    { icon: <BarChart3 className="h-5 w-5"/>, label: "Pi Price", value: fmt(m.piUsd || 0), color: "#56FF76" },
    { icon: m.change24h >= 0 ? <TrendingUp className="h-5 w-5"/> : <TrendingDown className="h-5 w-5"/>, label: "Change 24H", value: `${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(2)}%`, color: m.change24h >= 0 ? "#56FF76" : "#FF7676" },
    { icon: <BarChart3 className="h-5 w-5"/>, label: "24H High", value: fmt(m.high24h || 0), color: "#FFD76A" },
    { icon: <TrendingDown className="h-5 w-5"/>, label: "24H Low", value: fmt(m.low24h || 0), color: "#FF9F76" },
    { icon: <Coins className="h-5 w-5"/>, label: "24H Volume", value: `${(m.vol24h/1_000_000).toFixed(2)}M PI`, color: "#FFD76A" },
    { icon: <Crown className="h-5 w-5"/>, label: "USD/IDR", value: `Rp${m.usdIdr.toLocaleString("en-US",{maximumFractionDigits:0})}`, color: "#FFD76A" },
  ];
  return (
    <div className="glass-card p-4">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {items.map((s) => (
          <div key={s.label} className="flex flex-col items-center text-center">
            <GoldRing size={52}><span style={{ color: s.color }}>{s.icon}</span></GoldRing>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-emerald-100/60">{s.label}</div>
            <div className="text-sm font-semibold text-white">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureGrid() {
  const tap = useTap();
  const items = [
    { icon: <Wallet className="h-6 w-6"/>, label: "Wallet", to: "/wallet" },
    { icon: <Pickaxe className="h-6 w-6"/>, label: "Staking", to: "/staking" },
    { icon: <LineChartIcon className="h-6 w-6"/>, label: "Swap", to: "/swap" },
    { icon: <ShoppingCart className="h-6 w-6"/>, label: "Marketplace", to: "/marketplace" },
    { icon: <PlayCircle className="h-6 w-6"/>, label: "Entertainment", to: "/entertainment" },
    { icon: <Gift className="h-6 w-6"/>, label: "Check-In", to: "/checkin" },
    { icon: <Users className="h-6 w-6"/>, label: "Community", to: "/community" },
    { icon: <Crown className="h-6 w-6"/>, label: "Premium", to: "/premium" },
  ];
  return (
    <div className="glass-card p-4">
      <div className="grid grid-cols-4 gap-4 md:grid-cols-8">
        {items.map((f) => {
          const inner = (<>
            <HexIcon>{f.icon}</HexIcon>
            <div className="text-[11px] gold-text">{f.label}</div>
          </>);
          const cls = "flex flex-col items-center gap-2 transition hover:-translate-y-0.5 active:scale-95";
          return f.to ? (
            <Link key={f.label} to={f.to} onClick={tap} className={cls}>{inner}</Link>
          ) : (
            <button key={f.label} onClick={() => { tap(); toast("Coming soon"); }} className={cls}>{inner}</button>
          );
        })}
      </div>
    </div>
  );
}

function Portfolio() {
  const { fmt } = useSettings();
  const tap = useTap();
  const { balance } = useIdpointsBalance();
  const m = useMarket();
  const idpUsd = (balance / 9) / (m.usdIdr || 19906);
  return (
    <div className="glass-card p-4">
      <SectionTitle icon={<LineChartIcon className="h-4 w-4"/>} title="PORTFOLIO OVERVIEW"/>
      <div className="text-[11px] uppercase tracking-widest text-emerald-100/60">Total Value</div>
      <div className="text-3xl font-semibold emerald-text">{fmt(idpUsd)}</div>
      <div className="text-xs" style={{color:"#56FF76"}}>Live balance <span className="text-emerald-100/50">(IDPoints)</span></div>
      <Sparkline up seed={5}/>
      <div className="mt-3 space-y-2 text-sm">
        {[
          ["π","PI Balance","0.00 PI", fmt(0)],
          ["◈","IDPoints", `${balance.toLocaleString()} PTS`, fmt(idpUsd)],
          ["Σ","Total Assets","", fmt(idpUsd)],
        ].map((r) => (
          <div key={r[1]} className="flex items-center justify-between border-t pt-2" style={{borderColor:"rgba(255,215,106,.1)"}}>
            <div className="flex items-center gap-2 text-white">
              <span className="grid h-6 w-6 place-items-center rounded-full gold-border text-xs" style={{color:"#FFD76A"}}>{r[0]}</span>
              {r[1]}
            </div>
            <div className="flex gap-4 text-right">
              <span className="text-emerald-100/70">{r[2]}</span>
              <span className="text-white font-medium w-20">{r[3]}</span>
            </div>
          </div>
        ))}
      </div>
      <Link to="/wallet" onClick={tap}
        className="mt-3 block w-full rounded-lg gold-border py-2 text-sm gold-text text-center transition active:scale-[.98] hover:-translate-y-0.5">
        Open Wallet
      </Link>
    </div>
  );
}

function DailyCheckin() {
  const tap = useTap();
  const { state, evaluate } = useCheckin();
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const info = evaluate();
  const countdown = (() => {
    if (info.canClaim) return "Ready";
    const s = Math.floor(info.msLeft / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  })();
  return (
    <div className="glass-card flex flex-col p-4">
      <SectionTitle icon={<Trophy className="h-4 w-4"/>} title="DAILY CHECK-IN"/>
      <div className="flex justify-between text-xs text-emerald-100/60">
        <div><div>Streak</div><div className="mt-1 text-white text-base font-semibold">{state.streak}/7 Days</div></div>
        <div className="text-right"><div>Next Reward</div><div className="mt-1 gold-text text-base font-semibold">{countdown}</div></div>
      </div>
      <div className="relative my-4 grid place-items-center">
        <div className="absolute h-40 w-40 rounded-full anim-pulse-glow"
          style={{ background: "radial-gradient(circle, rgba(255,215,106,.35), transparent 70%)" }}/>
        <div className="relative grid h-32 w-32 place-items-center rounded-2xl anim-float"
          style={{ background: "linear-gradient(180deg, #6b4a10, #2a1a05)", border:"1.5px solid #FFD76A",
            boxShadow:"0 0 30px rgba(255,215,106,.5), inset 0 0 20px rgba(255,215,106,.3)" }}>
          <div className="text-4xl">🪙</div>
        </div>
        <div className="mt-3 text-xs text-emerald-100/60">Day {info.nextDay} Reward</div>
        <div className="gold-shimmer text-lg font-semibold">Up to 3,600 IDPoints</div>
      </div>
      <Link to="/checkin" onClick={tap}
        className="mt-auto rounded-lg gold-border py-2 text-sm gold-text text-center transition active:scale-[.98] hover:-translate-y-0.5">
        {info.canClaim ? "Claim Now" : "Open Check-In"}
      </Link>
    </div>
  );
}

function QuickActions() {
  const tap = useTap();
  const items = [
    { icon: <Send className="h-4 w-4"/>, title: "Send / Receive", sub: "Transfer your assets" },
    { icon: <CreditCard className="h-4 w-4"/>, title: "Pi Payments", sub: "Pay with Pi" },
    { icon: <Coins className="h-4 w-4"/>, title: "Buy IDPoints", sub: "Top up your IDPoints" },
    { icon: <ArrowLeftRight className="h-4 w-4"/>, title: "Convert", sub: "PI → USD ⇌ IDR" },
  ];
  return (
    <div className="glass-card p-4">
      <SectionTitle icon={<Sparkles className="h-4 w-4"/>} title="QUICK ACTIONS"/>
      <div className="flex flex-col gap-2">
        {items.map((a) => (
          <button key={a.title}
            onClick={() => { tap(); toast(`${a.title} · coming soon`); }}
            className="flex items-center gap-3 rounded-xl p-3 text-left transition hover:-translate-y-0.5 active:scale-[.98]"
            style={{ border:"1px solid rgba(255,215,106,.15)", background:"rgba(11,26,18,.6)" }}>
            <GoldRing size={40}><span style={{color:"#FFD76A"}}>{a.icon}</span></GoldRing>
            <div className="flex-1">
              <div className="text-sm text-white">{a.title}</div>
              <div className="text-[11px] text-emerald-100/60">{a.sub}</div>
            </div>
            <ChevronRight className="h-4 w-4" style={{color:"#FFD76A"}}/>
          </button>
        ))}
        <button onClick={() => { tap(); toast("All actions coming soon"); }}
          className="mt-1 rounded-lg gold-border py-2 text-sm gold-text transition active:scale-[.98] hover:-translate-y-0.5">
          All Actions
        </button>
      </div>
    </div>
  );
}

function IslamicStatus() {
  const items = ["Shariah Compliant","Riba Free","Halal Earnings","Ethical Investment"];
  return (
    <div className="glass-card p-4">
      <SectionTitle icon={<CheckCircle2 className="h-4 w-4"/>} title="ISLAMIC FINANCE STATUS"/>
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i} className="flex items-center justify-between text-sm text-white">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" style={{color:"#56FF76"}}/>{i}</span>
            <span className="gold-text">100%</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg p-2 text-xs" style={{background:"rgba(86,255,118,.08)", border:"1px solid rgba(86,255,118,.2)"}}>
        <CheckCircle2 className="h-4 w-4" style={{color:"#56FF76"}}/>
        <span className="text-white">This platform is 100% Shariah Compliant</span>
      </div>
    </div>
  );
}

function GlobalCommunity() {
  const tap = useTap();
  return (
    <div className="glass-card p-4">
      <SectionTitle icon={<Users className="h-4 w-4"/>} title="GLOBAL COMMUNITY"/>
      <div className="flex justify-between text-sm">
        <div><div className="text-[11px] text-emerald-100/60">Active Pioneers</div><div className="emerald-text text-lg font-semibold">2,345,678</div></div>
        <div className="text-right"><div className="text-[11px] text-emerald-100/60">Countries</div><div className="gold-text text-lg font-semibold">178</div></div>
      </div>
      <div className="my-3 grid h-28 place-items-center overflow-hidden rounded-lg"
        style={{background:"radial-gradient(circle at 50% 50%, rgba(86,255,118,.15), transparent 70%)"}}>
        <svg viewBox="0 0 200 90" className="h-full w-full opacity-80">
          {Array.from({length:180}).map((_,i)=>{
            const x = (i%30)*7 + 5, y = Math.floor(i/30)*15 + 5;
            const r = ((i * 2654435761) >>> 0) % 100 > 55 ? 0.9 : 0;
            return r ? <circle key={i} cx={x} cy={y} r={r} fill="#56FF76"/> : null;
          })}
        </svg>
      </div>
      <Link to="/community" onClick={tap}
        className="block w-full rounded-lg gold-border py-2 text-sm gold-text text-center transition active:scale-[.98] hover:-translate-y-0.5">
        Join Community
      </Link>
    </div>
  );
}

function News() {
  const { t } = useSettings();
  const tap = useTap();
  const items = [
    { title: "New Update ID-Space v2.0.1", date: "May 28, 2025" },
    { title: "Lunar Mining Season 2", date: "May 27, 2025" },
    { title: "IDPI Marketplace Launch", date: "May 25, 2025" },
  ];
  return (
    <div className="glass-card p-4">
      <SectionTitle icon={<Newspaper className="h-4 w-4"/>} title="NEWS & ANNOUNCEMENTS"/>
      <div className="flex flex-col gap-2">
        {items.map((n) => (
          <button key={n.title}
            onClick={() => { tap(); toast(n.title); }}
            className="flex items-center gap-3 rounded-lg p-2 text-left transition hover:-translate-y-0.5 active:scale-[.98]"
            style={{ border:"1px solid rgba(255,215,106,.12)"}}>
            <GoldRing size={34}><Newspaper className="h-3.5 w-3.5" style={{color:"#FFD76A"}}/></GoldRing>
            <div className="flex-1">
              <div className="text-sm text-white">{n.title}</div>
              <div className="text-[11px] text-emerald-100/50">{n.date}</div>
            </div>
            <ChevronRight className="h-4 w-4" style={{color:"#FFD76A"}}/>
          </button>
        ))}
        <button onClick={() => { tap(); toast(t("toast.viewAllNews")); }}
          className="mt-1 rounded-lg gold-border py-2 text-sm gold-text transition active:scale-[.98] hover:-translate-y-0.5">
          View All News
        </button>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
function Index() {
  return (
    <AppShell active="Home">
      <Hero/>
      <LivePiMarket/>
      <PiConverter/>
      <QuickStats/>
      <FeatureGrid/>
      <div className="grid gap-4 lg:grid-cols-3">
        <Portfolio/>
        <DailyCheckin/>
        <QuickActions/>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <IslamicStatus/>
        <GlobalCommunity/>
        <News/>
      </div>
    </AppShell>
  );
}
