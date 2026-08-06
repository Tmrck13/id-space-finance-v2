/**
 * Supabase-backed persistence for Pi authentication + Pi payments.
 * Server-only (service role) — never import from client code.
 *
 * All writes are best-effort: Pi flows must not fail if the DB write does,
 * so every helper swallows and logs errors instead of throwing.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function network(): string {
  return String(process.env["PI_SANDBOX"] ?? "true").toLowerCase() === "true"
    ? "testnet"
    : "mainnet";
}

/** Resolve the Supabase auth user linked to a Pi uid, if any. */
export async function findUserIdByPiUid(piUid: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("pi_uid", piUid)
      .maybeSingle();
    return data?.id ?? null;
  } catch (err) {
    console.error("[pi-db] findUserIdByPiUid failed", err);
    return null;
  }
}

/** Record (or refresh) a validated Pi sign-in. Never stores the access token. */
export async function recordPiAuthSession(params: {
  piUid: string;
  piUsername?: string;
  scopes?: string[];
}): Promise<void> {
  try {
    const userId = await findUserIdByPiUid(params.piUid);
    await supabaseAdmin.from("pi_auth_sessions").upsert(
      {
        pi_uid: params.piUid,
        pi_username: params.piUsername ?? null,
        user_id: userId,
        scopes: params.scopes ?? ["username", "payments"],
        network: network(),
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pi_uid" },
    );
  } catch (err) {
    console.error("[pi-db] recordPiAuthSession failed", err);
  }
}

/** Insert/refresh a Pi payment row at approval time. */
export async function recordPiPayment(params: {
  paymentId: string;
  piUid: string;
  productId: string;
  amountPi: number;
  memo?: string;
  metadata?: Record<string, unknown>;
  status: string;
  txid?: string;
}): Promise<void> {
  try {
    const userId = await findUserIdByPiUid(params.piUid);
    if (!userId) return; // Pi-only session with no linked account yet
    await supabaseAdmin.from("transactions").upsert(
      {
        payment_id: params.paymentId,
        user_id: userId,
        product_id: params.productId,
        amount_pi: params.amountPi,
        memo: params.memo ?? null,
        metadata: (params.metadata ?? {}) as never,
        status: params.status,
        txid: params.txid ?? null,
        network: network(),
        direction: "user_to_app",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "payment_id" },
    );
  } catch (err) {
    console.error("[pi-db] recordPiPayment failed", err);
  }
}

/** Mark a Pi payment settled and, on success, credit IDPoints via the ledger. */
export async function settlePiPayment(params: {
  paymentId: string;
  txid: string;
  status: "completed" | "cancelled" | "error";
  idpointsReward?: number;
  productId?: string;
}): Promise<void> {
  try {
    const { data: row } = await supabaseAdmin
      .from("transactions")
      .update({
        status: params.status,
        txid: params.txid,
        updated_at: new Date().toISOString(),
      })
      .eq("payment_id", params.paymentId)
      .select("id, user_id, ledger_id")
      .maybeSingle();

    if (!row || params.status !== "completed") return;
    if (row.ledger_id || !params.idpointsReward) return;

    // Balances may only change through the ledger posting function.
    const { data: ledgerId } = await supabaseAdmin.rpc("post_ledger_entry", {
      _user_id: row.user_id,
      _transaction_type: "pi_purchase_reward",
      _currency: "idpoints",
      _amount: params.idpointsReward,
      _description: `IDPoints reward for ${params.productId ?? "Pi purchase"}`,
      _status: "success",
      _reference: params.paymentId,
    });

    if (ledgerId) {
      await supabaseAdmin
        .from("transactions")
        .update({ ledger_id: ledgerId })
        .eq("id", row.id);
      await supabaseAdmin.from("idpoints").insert({
        user_id: row.user_id,
        ledger_id: ledgerId,
        event_type: "earn",
        amount: params.idpointsReward,
        source: "pi_purchase",
        description: params.productId ?? "Pi purchase",
      });
    }
  } catch (err) {
    console.error("[pi-db] settlePiPayment failed", err);
  }
}
