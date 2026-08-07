import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Loader2, KeyRound, ShieldAlert, RefreshCw, Trash2, Save, Activity, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, NeonCard, SectionTitle } from "@/components/idspace/shell";
import {
  adminGetBackendConfig,
  adminSaveSecret,
  adminDeleteSecret,
  adminRunReconciliation,
} from "@/lib/idpi.functions";

type SecretKey = "PI_NETWORK_API_KEY" | "PI_VALIDATION_KEY";

export const Route = createFileRoute("/_authenticated/admin-config")({
  head: () => ({
    meta: [
      { title: "Backend Configuration — ID•SPACE FINANCE" },
      { name: "description", content: "Encrypted Pi Mainnet credential vault and payment reconciliation controls for IDPI administrators." },
      { property: "og:title", content: "Backend Configuration — ID•SPACE FINANCE" },
      { property: "og:description", content: "Encrypted Pi Mainnet credential vault and payment reconciliation controls for IDPI administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BackendConfigPage,
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

function BackendConfigPage() {
  const fetchConfig = useServerFn(adminGetBackendConfig);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-backend-config"],
    queryFn: () => fetchConfig(),
    retry: false,
  });

  const runReconcile = useServerFn(adminRunReconciliation);
  const reconcile = useMutation({
    mutationFn: () => runReconcile(),
    onSuccess: (r) => {
      toast.success(`Reconciled ${r.scanned} payment(s) — ${r.updated} updated, ${r.failed} failed`);
      qc.invalidateQueries({ queryKey: ["admin-backend-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
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

  return (
    <AppShell active="admin">
      <div className="glass-card p-4 lg:p-6">
        <SectionTitle icon={<KeyRound className="h-4 w-4" />} title="BACKEND CONFIGURATION" />
        <p className="text-sm text-emerald-100/70">
          Pi Platform credentials are encrypted (AES-256-GCM) before storage and are readable only by
          backend service code. Values are never sent to the browser — only the masked hint below.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest"
          style={{ background: "rgba(11,26,18,.7)", border: "1px solid rgba(255,215,106,.3)", color: "#FFD76A" }}>
          Pi network: {data!.network}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {data!.secrets.map((s) => (
          <SecretCard key={s.key} secret={s} />
        ))}
      </div>

      <div className="glass-card p-4 lg:p-6">
        <SectionTitle icon={<RefreshCw className="h-4 w-4" />} title="PAYMENT RECONCILIATION" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-emerald-100/70">
            Open payments awaiting settlement: <span className="font-bold text-white">{data!.openPayments}</span>
          </div>
          <button
            onClick={() => reconcile.mutate()}
            disabled={reconcile.isPending}
            className="ml-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
            style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}
          >
            {reconcile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run sweep now
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {data!.runs.length === 0 ? (
            <p className="text-sm text-emerald-100/50">No reconciliation runs recorded yet.</p>
          ) : (
            data!.runs.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-xs"
                style={{ background: "rgba(11,26,18,.6)", border: "1px solid rgba(255,215,106,.12)" }}>
                <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "#FFD76A" }} />
                <span className="text-emerald-100/60">{new Date(r.started_at).toLocaleString()}</span>
                <span className="text-emerald-100/80">scanned {r.scanned}</span>
                <span style={{ color: "#56FF76" }}>updated {r.updated}</span>
                <span style={{ color: "#7FE7FF" }}>credited {r.settled}</span>
                <span className={r.failed ? "text-red-300" : "text-emerald-100/40"}>failed {r.failed}</span>
                <span className="ml-auto font-mono text-emerald-100/40">{r.trigger_source}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-card p-4 lg:p-6">
        <SectionTitle icon={<Activity className="h-4 w-4" />} title="PAYMENT AUDIT TRAIL" />
        {data!.events.length === 0 ? (
          <p className="text-sm text-emerald-100/50">No payment events recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {data!.events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-xs"
                style={{ background: "rgba(11,26,18,.6)", border: "1px solid rgba(255,215,106,.12)" }}>
                <span className="font-mono text-emerald-100/80">{e.event}</span>
                <span className="truncate font-mono text-emerald-100/45">{e.payment_id}</span>
                <span className="ml-auto shrink-0 text-emerald-100/40">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function SecretCard({
  secret,
}: {
  secret: { key: string; configured: boolean; source: string; hint: string | null; updatedAt: string | null };
}) {
  const qc = useQueryClient();
  const save = useServerFn(adminSaveSecret);
  const remove = useServerFn(adminDeleteSecret);
  const [value, setValue] = useState("");

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { key: secret.key as SecretKey, value } }),
    onSuccess: () => {
      toast.success(`${secret.key} stored securely`);
      setValue("");
      qc.invalidateQueries({ queryKey: ["admin-backend-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => remove({ data: { key: secret.key as SecretKey } }),
    onSuccess: () => {
      toast.success(`${secret.key} removed`);
      qc.invalidateQueries({ queryKey: ["admin-backend-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invalid = value.length > 0 && (value.length < 16 || /\s/.test(value));

  return (
    <div className="glass-card p-4 lg:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-emerald-50">{secret.key}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest"
          style={{
            border: `1px solid ${secret.configured ? "rgba(86,255,118,.4)" : "rgba(255,120,120,.4)"}`,
            color: secret.configured ? "#56FF76" : "#ff9a9a",
          }}
        >
          {secret.configured ? secret.source : "missing"}
        </span>
      </div>

      <div className="mt-2 text-xs text-emerald-100/50">
        {secret.hint ? <>Stored value: <span className="font-mono">{secret.hint}</span></> : "Not configured yet."}
        {secret.updatedAt && <> · updated {new Date(secret.updatedAt).toLocaleString()}</>}
      </div>

      <input
        type="password"
        autoComplete="off"
        value={value}
        placeholder={`Paste new ${secret.key}`}
        onChange={(e) => setValue(e.target.value)}
        className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm text-emerald-50 outline-none placeholder:text-emerald-100/35"
        style={{ background: "rgba(11,26,18,.6)", border: "1px solid rgba(255,215,106,.18)" }}
      />
      {invalid && (
        <div className="mt-1 text-[11px] text-red-300">
          Must be at least 16 characters and contain no spaces.
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !value || invalid}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
          style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save encrypted
        </button>
        {secret.source === "database" && (
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-emerald-50 disabled:opacity-50"
            style={{ background: "rgba(11,26,18,.7)", border: "1px solid rgba(255,120,120,.35)" }}
            aria-label="Remove stored secret"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
