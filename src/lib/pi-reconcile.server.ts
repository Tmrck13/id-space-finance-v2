/**
 * Pi payment reconciliation worker — SERVER ONLY.
 *
 * Periodically inspects every open Pi payment against the official Pi
 * Platform API and drives it to a terminal state:
 *
 *   completed  → transaction verified on-chain; reward credited + content unlocked
 *   cancelled  → cancelled by user or by Pi
 *   expired    → approved but never submitted on-chain within EXPIRY_HOURS
 *   pending    → still in flight; retried on the next sweep
 *
 * Guarantees:
 *  - idempotent: settlement is guarded by `transactions.ledger_id`,
 *    `settled_at` and the unique `user_entitlements.source_payment_id`
 *  - retries: failures bump `attempts` and store `last_error`
 *  - audit: every decision is appended to `pi_payment_events`, every sweep
 *    is recorded in `reconciliation_runs`
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PiPlatform, PiPlatformError, type PiPaymentDTO } from "./pi-platform.server";
import { getProduct } from "./pi-products";
import { logPaymentEvent, settlePiPayment } from "./pi-db.server";

const BATCH_SIZE = 50;
const EXPIRY_HOURS = 24;
const MAX_ATTEMPTS = 12;
const OPEN_STATUSES = ["created", "approved", "pending"] as const;

export type ReconcileOutcome = {
  runId: string | null;
  scanned: number;
  updated: number;
  settled: number;
  failed: number;
  results: Array<{ paymentId: string; outcome: string; error?: string }>;
};

function classify(remote: PiPaymentDTO, createdAt: string): "completed" | "cancelled" | "expired" | "pending" {
  if (remote.status?.cancelled || remote.status?.user_cancelled) return "cancelled";
  if (remote.status?.transaction_verified && remote.status?.developer_completed) return "completed";
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (!remote.transaction?.txid && ageHours > EXPIRY_HOURS) return "expired";
  return "pending";
}

export async function reconcilePiPayments(
  triggerSource: "cron" | "admin" = "cron",
): Promise<ReconcileOutcome> {
  const out: ReconcileOutcome = {
    runId: null,
    scanned: 0,
    updated: 0,
    settled: 0,
    failed: 0,
    results: [],
  };

  const { data: run } = await supabaseAdmin
    .from("reconciliation_runs")
    .insert({ trigger_source: triggerSource })
    .select("id")
    .maybeSingle();
  out.runId = run?.id ?? null;

  const { data: open } = await supabaseAdmin
    .from("transactions")
    .select("id, payment_id, product_id, status, txid, attempts, created_at, user_id")
    .in("status", OPEN_STATUSES as unknown as string[])
    .not("payment_id", "is", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("updated_at", { ascending: true })
    .limit(BATCH_SIZE);

  const rows = open ?? [];
  out.scanned = rows.length;

  for (const row of rows) {
    const paymentId = row.payment_id!;
    try {
      const remote = await PiPlatform.getPayment(paymentId);
      const verdict = classify(remote, row.created_at);
      const product = row.product_id ? getProduct(row.product_id) : undefined;

      if (verdict === "pending") {
        await supabaseAdmin
          .from("transactions")
          .update({
            attempts: (row.attempts ?? 0) + 1,
            reconciled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        await logPaymentEvent({
          paymentId,
          event: "reconcile:pending",
          status: "pending",
          source: "reconciliation",
          detail: { piStatus: remote.status as never },
        });
        out.results.push({ paymentId, outcome: "pending" });
        continue;
      }

      let txid = remote.transaction?.txid ?? row.txid ?? "";

      if (verdict === "completed" || (txid && verdict !== "cancelled" && verdict !== "expired")) {
        // Ensure the developer-side completion call has happened.
        if (txid && !remote.status?.developer_completed) {
          const completed = await PiPlatform.completePayment(paymentId, txid);
          if (!completed.status?.transaction_verified) {
            throw new PiPlatformError("Transaction not verified by Pi Network", 400);
          }
          txid = completed.transaction?.txid ?? txid;
        }
        const result = await settlePiPayment({
          paymentId,
          txid,
          status: "completed",
          idpointsReward: product?.reward.idpoints,
          productId: row.product_id ?? undefined,
          productKind: product?.kind,
          durationDays: product?.reward.durationDays,
          source: "reconciliation",
        });
        out.updated += 1;
        if (result.credited) out.settled += 1;
        out.results.push({ paymentId, outcome: "completed" });
        continue;
      }

      await supabaseAdmin
        .from("transactions")
        .update({
          status: verdict,
          reconciled_at: new Date().toISOString(),
          settled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      await logPaymentEvent({
        paymentId,
        event: `reconcile:${verdict}`,
        status: verdict,
        source: "reconciliation",
        detail: { piStatus: remote.status as never },
      });
      out.updated += 1;
      out.results.push({ paymentId, outcome: verdict });
    } catch (err) {
      const message = err instanceof Error ? err.message : "reconciliation failed";
      out.failed += 1;
      out.results.push({ paymentId, outcome: "error", error: message });
      await supabaseAdmin
        .from("transactions")
        .update({
          attempts: (row.attempts ?? 0) + 1,
          last_error: message,
          reconciled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      await logPaymentEvent({
        paymentId,
        event: "reconcile:error",
        source: "reconciliation",
        detail: { error: message },
      });
    }
  }

  if (out.runId) {
    await supabaseAdmin
      .from("reconciliation_runs")
      .update({
        finished_at: new Date().toISOString(),
        scanned: out.scanned,
        updated: out.updated,
        settled: out.settled,
        failed: out.failed,
        detail: { results: out.results } as never,
      })
      .eq("id", out.runId);
  }

  return out;
}
