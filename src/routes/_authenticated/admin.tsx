import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Loader2, Users, Store, Wallet as WalletIcon, ScrollText, Gift, Bell,
  Image as ImageIcon, ShieldAlert, Clock, Megaphone, Send,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, NeonCard, SectionTitle } from "@/components/idspace/shell";
import {
  getAdminOverview,
  adminCreateNotification,
  adminCreateRunningText,
} from "@/lib/idpi.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ID•SPACE FINANCE" },
      { name: "description", content: "IDPI admin control center: monitor wallets, ledger activity, rewards and broadcast announcements." },
      { property: "og:title", content: "Admin Dashboard — ID•SPACE FINANCE" },
      { property: "og:description", content: "IDPI admin control center: monitor wallets, ledger activity, rewards and broadcast announcements." },
    ],
  }),
  component: AdminDashboard,
  errorComponent: ({ error }) => (
    <AppShell active="admin">
      <NeonCard>
        <div className="rounded-[18px] p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10" style={{ color: "#FFD76A" }} />
          <h2 className="mt-3 font-display text-xl gold-shimmer">Access restricted</h2>
          <p className="mt-2 text-sm text-emerald-100/60">
            {error.message === "Forbidden"
              ? "This area is reserved for IDPI administrators."
              : error.message}
          </p>
        </div>
      </NeonCard>
    </AppShell>
  ),
});

function AdminDashboard() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    retry: false,
  });

  if (isLoading) {
    return (
      <AppShell active="admin">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#FFD76A" }} />
        </div>
      </AppShell>
    );
  }

  if (error) throw error;

  const c = data!.counts;
  const t = data!.totals;

  return (
    <AppShell active="admin">
      <div className="glass-card p-4 lg:p-6">
        <SectionTitle icon={<ShieldAlert className="h-4 w-4" />} title="ADMIN CONTROL CENTER" />
        <p className="text-sm text-emerald-100/70">
          Every balance movement is written to the immutable ledger. Direct balance edits are impossible by design.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Users" value={c.users} />
        <StatCard icon={<Store className="h-4 w-4" />} label="Merchants" value={c.merchants} />
        <StatCard icon={<WalletIcon className="h-4 w-4" />} label="Wallets" value={c.wallets} />
        <StatCard icon={<ScrollText className="h-4 w-4" />} label="Ledger entries" value={c.ledgerEntries} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={c.pending} />
        <StatCard icon={<Gift className="h-4 w-4" />} label="Rewards" value={c.rewards} />
        <StatCard icon={<Bell className="h-4 w-4" />} label="Notifications" value={c.notifications} />
        <StatCard icon={<ImageIcon className="h-4 w-4" />} label="Banners" value={c.banners} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <TotalCard label="Total Pi" value={t.pi} suffix="π" color="#FFD76A" />
        <TotalCard label="Total IDPoints" value={t.idpoints} suffix="IDP" color="#56FF76" />
        <TotalCard label="Total Cashback" value={t.cashback} suffix="IDP" color="#7FE7FF" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <BroadcastPanel />
        <ActivityPanel logs={data!.logs} />
      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-emerald-100/50">
        <span style={{ color: "#FFD76A" }}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function TotalCard({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-emerald-100/50">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color }}>
        {value.toLocaleString(undefined, { maximumFractionDigits: 4 })} <span className="text-xs">{suffix}</span>
      </div>
    </div>
  );
}

function BroadcastPanel() {
  const qc = useQueryClient();
  const createNotification = useServerFn(adminCreateNotification);
  const createRunningText = useServerFn(adminCreateRunningText);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [ticker, setTicker] = useState("");

  const notify = useMutation({
    mutationFn: () => createNotification({ data: { title, message, targetRole: null } }),
    onSuccess: () => {
      toast.success("Notification broadcast");
      setTitle(""); setMessage("");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tick = useMutation({
    mutationFn: () => createRunningText({ data: { message: ticker } }),
    onSuccess: () => {
      toast.success("Running text published");
      setTicker("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-card p-4 lg:p-6">
      <SectionTitle icon={<Megaphone className="h-4 w-4" />} title="BROADCAST" />
      <div className="space-y-2">
        <Input placeholder="Notification title" value={title} onChange={setTitle} />
        <Input placeholder="Notification message" value={message} onChange={setMessage} />
        <button
          onClick={() => notify.mutate()}
          disabled={notify.isPending || !title || !message}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
          style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}
        >
          {notify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send to all users
        </button>
      </div>

      <div className="mt-5 space-y-2">
        <Input placeholder="Running text message" value={ticker} onChange={setTicker} />
        <button
          onClick={() => tick.mutate()}
          disabled={tick.isPending || !ticker}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-50 disabled:opacity-50"
          style={{ background: "rgba(11,26,18,.7)", border: "1px solid rgba(255,215,106,.35)" }}
        >
          {tick.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          Publish running text
        </button>
      </div>
    </div>
  );
}

function ActivityPanel({ logs }: { logs: Array<{ id: string; activity: string; created_at: string }> }) {
  return (
    <div className="glass-card p-4 lg:p-6">
      <SectionTitle icon={<ScrollText className="h-4 w-4" />} title="ADMIN ACTIVITY" />
      {logs.length === 0 ? (
        <p className="text-sm text-emerald-100/50">No admin activity recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(11,26,18,.6)", border: "1px solid rgba(255,215,106,.12)" }}>
              <span className="truncate font-mono text-emerald-100/80">{l.activity}</span>
              <span className="shrink-0 text-emerald-100/40">
                {new Date(l.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Input({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl px-3 py-2.5 text-sm text-emerald-50 outline-none placeholder:text-emerald-100/35"
      style={{ background: "rgba(11,26,18,.6)", border: "1px solid rgba(255,215,106,.18)" }}
    />
  );
}
