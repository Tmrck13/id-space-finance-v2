import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pickaxe, Sparkles, Coins, TrendingUp, History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionTitle } from "@/components/idspace/shell";
import {
  useStaking, useIdpointsBalance, computeStakeReward,
} from "@/lib/idpoints-store";

export const Route = createFileRoute("/staking")({
  component: StakingPage,
  head: () => ({
    meta: [
      { title: "Staking — IDPI" },
      { name: "description", content: "Stake IDPoints and earn daily rewards at 12% APR." },
    ],
  }),
});

function StakingPage() {
  const { balance } = useIdpointsBalance();
  const { staking, apr, stake, claim, unstake } = useStaking();
  const [amount, setAmount] = useState("1000");
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const parsed = useMemo(() => Math.max(0, Math.floor(parseFloat(amount.replace(/,/g, "")) || 0)), [amount]);
  const estYear = Math.floor(parsed * (apr / 100));
  const estDay = Math.floor(estYear / 365);

  const totalStaked = staking.active.reduce((s, x) => s + x.amount, 0);
  const totalPending = staking.active.reduce((s, x) => s + computeStakeReward(x), 0);

  const onStake = () => {
    const r = stake(parsed);
    if (!r.ok) return toast.error(r.reason === "balance" ? "Insufficient balance" : "Invalid amount");
    toast.success(`Staked ${parsed.toLocaleString()} IDPoints`);
  };

  return (
    <AppShell active="Staking">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Staking</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">IDPoints Staking</h1>
          <p className="mt-2 text-xs text-emerald-100/60">
            Fixed APR: <span className="gold-text">{apr.toFixed(0)}%</span> · Rewards accrue every second
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Balance" value={balance.toLocaleString()} color="#FFD76A"/>
          <Stat label="Total Staked" value={totalStaked.toLocaleString()} color="#56FF76"/>
          <Stat label="Pending Reward" value={`+${totalPending.toLocaleString()}`} color="#7CC3FF"/>
        </div>

        {/* Stake form */}
        <div className="glass-card p-4 lg:p-5 mt-4">
          <SectionTitle icon={<Pickaxe className="h-4 w-4"/>} title="STAKE IDPOINTS"/>
          <div className="flex items-center gap-3 rounded-xl p-3"
               style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.2)" }}>
            <Coins className="h-5 w-5" style={{ color: "#FFD76A" }}/>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              className="flex-1 bg-transparent font-mono text-xl text-white outline-none"
              placeholder="0"
            />
            <button onClick={() => setAmount(String(balance))}
                    className="rounded-full gold-border px-3 py-1 text-[11px] gold-text">MAX</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <Est label="Est. Daily Reward" value={`+${estDay.toLocaleString()} IDP`}/>
            <Est label="Est. Yearly Reward" value={`+${estYear.toLocaleString()} IDP`}/>
          </div>
          <button onClick={onStake} disabled={parsed <= 0 || parsed > balance}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(90deg,#FFD76A,#56FF76,#FFD76A)",
              backgroundSize: "200% 100%",
              animation: "shimmer 5s linear infinite, pulseGlow 3.5s ease-in-out infinite",
            }}>
            <Sparkles className="h-4 w-4"/> Stake Now
          </button>
        </div>

        {/* Active */}
        <div className="glass-card p-4 lg:p-5 mt-4">
          <SectionTitle icon={<TrendingUp className="h-4 w-4"/>} title="ACTIVE STAKES"/>
          {staking.active.length === 0 ? (
            <div className="rounded-lg p-4 text-center text-xs text-emerald-100/50"
                 style={{ background: "rgba(5,8,6,.5)", border: "1px dashed rgba(255,215,106,.2)" }}>
              No active stakes.
            </div>
          ) : (
            <ul className="space-y-2">
              {staking.active.map((s) => {
                const reward = computeStakeReward(s);
                return (
                  <li key={s.id} className="rounded-lg p-3"
                      style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.15)" }}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="text-emerald-100/60">Amount</div>
                        <div className="font-mono gold-text">{s.amount.toLocaleString()} IDP</div>
                      </div>
                      <div>
                        <div className="text-emerald-100/60">Reward</div>
                        <div className="font-mono" style={{ color: "#56FF76" }}>+{reward.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-emerald-100/60">Started</div>
                        <div className="text-white">{new Date(s.startedAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          const r = claim(s.id);
                          if (r.ok) toast.success(`+${r.reward} IDPoints`);
                          else toast("No reward to claim yet");
                        }} className="rounded-full gold-border px-3 py-1 text-[11px] gold-text">
                          Claim
                        </button>
                        <button onClick={() => {
                          const r = unstake(s.id);
                          if (r.ok) toast.success(`Unstaked · +${(s.amount + r.reward).toLocaleString()}`);
                        }} className="rounded-full px-3 py-1 text-[11px] text-white"
                          style={{ border: "1px solid rgba(255,118,118,.5)", color: "#FF9F9F" }}>
                          Unstake
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* History */}
        <div className="glass-card p-4 lg:p-5 mt-4">
          <SectionTitle icon={<HistoryIcon className="h-4 w-4"/>} title="STAKING HISTORY"/>
          {staking.history.length === 0 ? (
            <div className="rounded-lg p-4 text-center text-xs text-emerald-100/50"
                 style={{ background: "rgba(5,8,6,.5)", border: "1px dashed rgba(255,215,106,.2)" }}>
              No completed stakes.
            </div>
          ) : (
            <ul className="space-y-2 text-xs">
              {staking.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="text-white">
                    Unstaked <span className="gold-text">{h.amount.toLocaleString()}</span> · Reward <span style={{ color: "#56FF76" }}>+{h.reward.toLocaleString()}</span>
                  </span>
                  <span className="text-emerald-100/50">{new Date(h.endedAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3"
         style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}>
      <div className="text-[10px] uppercase tracking-widest text-emerald-100/50">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function Est({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2"
         style={{ background: "rgba(5,8,6,.55)", border: "1px solid rgba(86,255,118,.2)" }}>
      <div className="text-[10px] text-emerald-100/60 uppercase tracking-widest">{label}</div>
      <div className="font-mono" style={{ color: "#56FF76" }}>{value}</div>
    </div>
  );
}