import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, Flame, Gift, Loader2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionTitle } from "@/components/idspace/shell";
import { useCheckin, useIdpointsBalance } from "@/lib/idpoints-store";

export const Route = createFileRoute("/checkin")({
  component: CheckinPage,
  head: () => ({
    meta: [
      { title: "Daily Check-In — IDPI" },
      { name: "description", content: "Claim your daily IDPoints reward. 7-day streak up to 9,000 IDPoints." },
    ],
  }),
});

type Config = {
  rewards: number[];
  cycleDays: number;
  idpointsPerIdr: number;
  total: number;
};

const DEFAULT_CONFIG: Config = {
  rewards: [180, 360, 540, 900, 1350, 2070, 3600],
  cycleDays: 7,
  idpointsPerIdr: 9,
  total: 9000,
};

function fmtCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function CheckinPage() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [tick, setTick] = useState(0);

  const { state, evaluate, claim } = useCheckin();
  const { balance, add } = useIdpointsBalance();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/public/rewards-config")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j?.ok && Array.isArray(j.rewards)) {
          setConfig({
            rewards: j.rewards,
            cycleDays: j.cycleDays ?? 7,
            idpointsPerIdr: j.idpointsPerIdr ?? 9,
            total: j.total ?? j.rewards.reduce((a: number, b: number) => a + b, 0),
          });
        }
      })
      .catch(() => { /* offline: keep defaults */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Live countdown tick
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const info = useMemo(() => evaluate(), [evaluate, tick]);
  const nextIndex = Math.min(config.rewards.length - 1, Math.max(0, (info.nextDay || 1) - 1));
  const nextReward = config.rewards[nextIndex] ?? 0;
  const progressPct = Math.min(100, (state.streak / config.cycleDays) * 100);

  const handleClaim = useCallback(async () => {
    if (!info.canClaim || claiming) return;
    setClaiming(true);
    // brief animation delay
    await new Promise((r) => setTimeout(r, 400));
    const res = claim(nextReward);
    if (res.ok) {
      add(res.amount);
      toast.success(`+${res.amount.toLocaleString()} IDPoints (Day ${res.day})`);
      if (res.cycleCompleted) {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 4000);
      }
    } else {
      toast("Already claimed. Come back later.");
    }
    setClaiming(false);
  }, [info.canClaim, claiming, claim, nextReward, add]);

  const idrValue = Math.floor(config.total / config.idpointsPerIdr);

  return (
    <AppShell active="checkin">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Rewards</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">Daily Check-In</h1>
          <p className="mt-2 text-xs text-emerald-100/60">
            Claim every 24h · Full 7-day cycle = <span className="gold-text">{config.total.toLocaleString()} IDPoints</span> (≈ Rp{idrValue.toLocaleString()})
          </p>
        </div>

        {/* Streak overview */}
        <div className="glass-card p-4 lg:p-5 mb-4">
          <SectionTitle
            icon={<Flame className="h-4 w-4"/>}
            title="STREAK"
            right={<span className="text-[11px] gold-text">Balance: {balance.toLocaleString()} IDPoints</span>}
          />
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Current Streak" value={`${state.streak}/${config.cycleDays}`} color="#FFD76A"/>
            <StatBox label="Cycles Completed" value={String(state.cyclesCompleted)} color="#56FF76"/>
            <StatBox label="Next Reward" value={`+${nextReward.toLocaleString()}`} color="#7CC3FF"/>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full"
               style={{ background: "rgba(5,8,6,.7)", border: "1px solid rgba(255,215,106,.2)" }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{
                   width: `${progressPct}%`,
                   background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                   backgroundSize: "200% 100%",
                   animation: "shimmer 4s linear infinite",
                   boxShadow: "0 0 14px rgba(86,255,118,.4)",
                 }}/>
          </div>
          <div className="mt-1 text-right text-[10px] text-emerald-100/50">
            {progressPct.toFixed(0)}% of current cycle
          </div>
        </div>

        {/* Day grid */}
        <div className="glass-card p-4 lg:p-5 mb-4">
          <SectionTitle
            icon={<Gift className="h-4 w-4"/>}
            title="7-DAY REWARDS"
            right={loading ? <Loader2 className="h-3.5 w-3.5 animate-spin gold-text"/> : null}
          />
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {config.rewards.map((amt, i) => {
              const day = i + 1;
              const claimed = day <= state.streak;
              const isToday = day === info.nextDay && info.canClaim;
              const isCycleFinale = day === config.cycleDays;
              return (
                <div key={day}
                     className="relative flex flex-col items-center justify-center rounded-xl p-2 text-center transition"
                     style={{
                       background: claimed
                         ? "linear-gradient(180deg, rgba(86,255,118,.15), rgba(11,26,18,.9))"
                         : "rgba(5,8,6,.6)",
                       border: `1px solid ${
                         isToday ? "rgba(255,215,106,.8)"
                         : claimed ? "rgba(86,255,118,.5)"
                         : "rgba(255,215,106,.15)"
                       }`,
                       boxShadow: isToday ? "0 0 18px rgba(255,215,106,.35)" : undefined,
                     }}>
                  <div className="text-[10px] uppercase tracking-widest text-emerald-100/60">Day {day}</div>
                  <div className="mt-1 flex h-8 w-8 items-center justify-center">
                    {claimed ? (
                      <Check className="h-5 w-5" style={{ color: "#56FF76" }}/>
                    ) : isCycleFinale ? (
                      <Trophy className="h-5 w-5" style={{ color: "#FFD76A" }}/>
                    ) : (
                      <Sparkles className="h-4 w-4" style={{ color: "#FFD76A" }}/>
                    )}
                  </div>
                  <div className="text-[11px] font-bold" style={{ color: claimed ? "#56FF76" : "#FFD76A" }}>
                    +{amt.toLocaleString()}
                  </div>
                  {isToday && (
                    <span className="absolute -top-2 rounded-full px-2 py-0.5 text-[9px] font-bold text-black gold-shimmer"
                          style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
                      TODAY
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Claim panel */}
        <div className="relative rounded-2xl p-[1.5px] anim-pulse-glow"
             style={{
               background: "linear-gradient(120deg,#FFD76A,#56FF76,#FFD76A)",
               backgroundSize: "200% 200%",
               animation: "shimmer 6s linear infinite, pulseGlow 3.5s ease-in-out infinite",
             }}>
          <div className="rounded-[15px] glass-card p-5 text-center">
            <CalendarCheck className="mx-auto h-8 w-8" style={{ color: "#FFD76A" }}/>
            {info.canClaim ? (
              <>
                <div className="mt-2 font-display text-xl gold-shimmer">
                  Day {info.nextDay} Reward Ready
                </div>
                <div className="mt-1 text-xs text-emerald-100/60">
                  Claim +{nextReward.toLocaleString()} IDPoints now
                </div>
              </>
            ) : (
              <>
                <div className="mt-2 font-display text-xl text-white">
                  Next Claim In
                </div>
                <div className="mt-2 font-mono text-3xl gold-shimmer">
                  {fmtCountdown(info.msLeft)}
                </div>
                <div className="mt-1 text-xs text-emerald-100/60">
                  Day {info.nextDay} · +{nextReward.toLocaleString()} IDPoints
                </div>
              </>
            )}
            <button
              onClick={handleClaim}
              disabled={!info.canClaim || claiming}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition active:scale-95 disabled:opacity-50"
              style={{
                background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
                backgroundSize: "200% 100%",
                animation: info.canClaim
                  ? "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite"
                  : "none",
              }}
            >
              {claiming ? <Loader2 className="h-4 w-4 animate-spin"/> : <Gift className="h-4 w-4"/>}
              {claiming ? "Claiming…" : info.canClaim ? "Claim Reward" : "Come back later"}
            </button>
            {info.resets && info.canClaim && state.streak > 0 && (
              <div className="mt-2 text-[10px]" style={{ color: "#FF9F76" }}>
                Missed a day — streak will restart at Day 1.
              </div>
            )}
          </div>
        </div>

        {/* History */}
        {state.history.length > 0 && (
          <div className="glass-card p-4 lg:p-5 mt-4">
            <SectionTitle icon={<Flame className="h-4 w-4"/>} title="RECENT CLAIMS"/>
            <ul className="space-y-2">
              {state.history.slice(0, 7).map((h) => (
                <li key={h.at} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="text-emerald-100/80">Day {h.day} · <span className="gold-text">+{h.amount.toLocaleString()}</span> IDPoints</span>
                  <span className="text-emerald-100/50">{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {confetti && <Confetti/>}
    </AppShell>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3"
         style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}>
      <div className="text-[10px] uppercase tracking-widest text-emerald-100/50">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

/* Lightweight CSS-only confetti burst — no extra deps. */
function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 2 + Math.random() * 2,
      hue: [`#FFD76A`, `#56FF76`, `#7CC3FF`, `#FF9F76`][i % 4],
      size: 6 + Math.random() * 8,
      rot: Math.random() * 360,
    })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {pieces.map((p) => (
        <span key={p.id} className="absolute -top-4"
              style={{
                left: `${p.left}%`,
                width: p.size, height: p.size * 0.4,
                background: p.hue,
                transform: `rotate(${p.rot}deg)`,
                animation: `confettiFall ${p.dur}s ${p.delay}s linear forwards`,
                boxShadow: `0 0 6px ${p.hue}`,
              }}/>
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}