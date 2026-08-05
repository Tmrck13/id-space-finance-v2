import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, ArrowDownUp,
  Gift, History as HistoryIcon, Coins, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionTitle, GoldRing } from "@/components/idspace/shell";
import {
  useIdpointsBalance, useSwapHistory, useTransactions, useCheckin,
} from "@/lib/idpoints-store";
import { useMarket } from "@/lib/market-store";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  head: () => ({
    meta: [
      { title: "Wallet — IDPI" },
      { name: "description", content: "Your Pi and IDPoints wallet: balances, deposits, swaps, and rewards." },
    ],
  }),
});

function WalletPage() {
  const { balance, add } = useIdpointsBalance();
  const { txs } = useTransactions();
  const { items: swaps } = useSwapHistory();
  const { state: checkin } = useCheckin();
  const m = useMarket();

  const idrValue = useMemo(() => Math.floor(balance / 9), [balance]);
  const usdValue = useMemo(
    () => (m.usdIdr > 0 ? idrValue / m.usdIdr : 0),
    [idrValue, m.usdIdr],
  );

  const deposit = () => { add(1000, "Testnet deposit", "deposit"); toast.success("+1,000 IDPoints"); };
  const withdraw = () => toast("Withdraw coming soon (Mainnet)");

  return (
    <AppShell active="Wallet">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Wallet</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">My Wallet</h1>
        </div>

        {/* Balances */}
        <div className="grid gap-3 md:grid-cols-2">
          <BalanceCard
            symbol="π" label="Pi Balance"
            value="0.00000000 PI"
            sub="Connect Pi Wallet to sync"
            color="#FFD76A"
          />
          <BalanceCard
            symbol="◈" label="IDPoints Balance"
            value={`${balance.toLocaleString()} IDP`}
            sub={`≈ Rp${idrValue.toLocaleString()} · $${usdValue.toFixed(2)}`}
            color="#56FF76"
          />
        </div>

        {/* Actions */}
        <div className="glass-card p-4 mt-4">
          <SectionTitle icon={<Sparkles className="h-4 w-4"/>} title="ACTIONS"/>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ActionButton icon={<ArrowDownToLine className="h-5 w-5"/>} label="Deposit" onClick={deposit}/>
            <ActionButton icon={<ArrowUpFromLine className="h-5 w-5"/>} label="Withdraw" onClick={withdraw}/>
            <ActionLink icon={<ArrowDownUp className="h-5 w-5"/>} label="Swap" to="/swap"/>
            <ActionLink icon={<Gift className="h-5 w-5"/>} label="Check-In" to="/checkin"/>
          </div>
        </div>

        {/* Transaction history */}
        <div className="glass-card p-4 mt-4">
          <SectionTitle icon={<HistoryIcon className="h-4 w-4"/>} title="TRANSACTION HISTORY"/>
          {txs.length === 0 ? (
            <Empty>No transactions yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {txs.slice(0, 20).map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="flex items-center gap-2 text-white">
                    <span className="uppercase text-[10px] gold-text w-20">{t.kind}</span>
                    {t.note}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono" style={{ color: t.delta >= 0 ? "#56FF76" : "#FF7676" }}>
                      {t.delta >= 0 ? "+" : ""}{t.delta.toLocaleString()}
                    </span>
                    <span className="text-emerald-100/50">{new Date(t.at).toLocaleTimeString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Swap history */}
        <div className="glass-card p-4 mt-4">
          <SectionTitle icon={<ArrowDownUp className="h-4 w-4"/>} title="SWAP HISTORY"
            right={<Link to="/swap" className="text-[11px] gold-text hover:underline">Open Swap</Link>}/>
          {swaps.length === 0 ? <Empty>No swaps yet.</Empty> : (
            <ul className="space-y-2">
              {swaps.slice(0, 10).map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="font-mono text-white">
                    {h.amount.toLocaleString()} {h.from} → {h.result.toLocaleString()} {h.to}
                  </span>
                  <span className="text-emerald-100/50">{new Date(h.at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reward history */}
        <div className="glass-card p-4 mt-4">
          <SectionTitle icon={<Gift className="h-4 w-4"/>} title="REWARD HISTORY"
            right={<Link to="/checkin" className="text-[11px] gold-text hover:underline">Open Check-In</Link>}/>
          {checkin.history.length === 0 ? <Empty>No rewards claimed yet.</Empty> : (
            <ul className="space-y-2">
              {checkin.history.slice(0, 10).map((r) => (
                <li key={r.at} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="text-white">Day {r.day} · <span className="gold-text">+{r.amount.toLocaleString()}</span> IDPoints</span>
                  <span className="text-emerald-100/50">{new Date(r.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function BalanceCard({ symbol, label, value, sub, color }: {
  symbol: string; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <GoldRing size={64}>
        <span className="text-2xl font-bold" style={{ color }}>{symbol}</span>
      </GoldRing>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-emerald-100/60">{label}</div>
        <div className="text-2xl font-semibold text-white font-mono">{value}</div>
        <div className="text-[11px] gold-text">{sub}</div>
      </div>
      <Coins className="h-4 w-4 opacity-50" style={{ color }}/>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl p-3 transition hover:-translate-y-0.5 active:scale-95"
      style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.2)" }}>
      <GoldRing size={44}><span style={{ color: "#FFD76A" }}>{icon}</span></GoldRing>
      <span className="text-xs text-white">{label}</span>
    </button>
  );
}

function ActionLink({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link to={to}
      className="flex flex-col items-center gap-2 rounded-xl p-3 transition hover:-translate-y-0.5 active:scale-95"
      style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.2)" }}>
      <GoldRing size={44}><span style={{ color: "#FFD76A" }}>{icon}</span></GoldRing>
      <span className="text-xs text-white">{label}</span>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4 text-center text-xs text-emerald-100/50"
         style={{ background: "rgba(5,8,6,.5)", border: "1px dashed rgba(255,215,106,.2)" }}>
      {children}
    </div>
  );
}

// Icon-alias to satisfy strict TS unused warnings.
void WalletIcon;