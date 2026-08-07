/**
 * IDPI Core Foundation — typed server functions.
 *
 * These are the single entry points the whole IDPI ecosystem
 * (ID-Space Finance, IDPI Marketplace, Merchant Center, future apps)
 * uses to reach the unified wallet + ledger.
 *
 * Rules enforced here:
 *  - No balance ever changes outside `post_ledger_entry` / `settle_ledger_entry`.
 *  - Admin-only actions verify the caller's role through RLS before touching data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------------- Session-scoped reads ---------------- */

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profile, wallet, roles] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const ledgerRes = wallet.data?.id
      ? await supabase
          .from("ledger")
          .select("*")
          .eq("wallet_id", wallet.data.id)
          .order("created_at", { ascending: false })
          .limit(50)
      : null;

    return {
      profile: profile.data ?? null,
      wallet: wallet.data ?? null,
      roles: (roles.data ?? []).map((r) => r.role),
      ledger: ledgerRes?.data ?? [],
    };

  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        username: z.string().min(3).max(32).optional(),
        avatar: z.string().url().max(500).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Public content (banners / running text) ---------------- */

export const getAppContent = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const [banners, runningText, membership] = await Promise.all([
    client
      .from("banners")
      .select("id, image, title, description, link, order_number")
      .eq("is_active", true)
      .order("order_number"),
    client.from("running_text").select("id, message").eq("is_active", true).order("order_number"),
    client.from("membership").select("level, badge, benefits, profile_frame, profile_background").order("order_number"),
  ]);

  return {
    banners: banners.data ?? [],
    runningText: runningText.data ?? [],
    membership: membership.data ?? [],
  };
});

/* ---------------- Admin ---------------- */

async function assertAdmin(supabase: {
  rpc: (fn: "is_admin") => PromiseLike<{ data: unknown }>;
}) {
  const { data } = await supabase.rpc("is_admin");
  if (data !== true) throw new Error("Forbidden");
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    await assertAdmin(supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const count = async (table: "profiles" | "wallets" | "ledger" | "rewards" | "notifications" | "banners") => {
      const { count: c } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true });
      return c ?? 0;
    };

    const [users, wallets, ledgerEntries, rewards, notifications, banners] = await Promise.all([
      count("profiles"),
      count("wallets"),
      count("ledger"),
      count("rewards"),
      count("notifications"),
      count("banners"),
    ]);

    const [{ count: merchants }, { count: pending }, totals, logs] = await Promise.all([
      supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "merchant"),
      supabaseAdmin.from("ledger").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("wallets").select("pi_balance, idpoints_balance, cashback_balance"),
      supabaseAdmin.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(10),
    ]);

    const sum = (rows: Array<Record<string, unknown>>, key: string) =>
      rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
    const rows = totals.data ?? [];

    return {
      counts: { users, merchants: merchants ?? 0, wallets, ledgerEntries, rewards, notifications, banners, pending: pending ?? 0 },
      totals: {
        pi: sum(rows, "pi_balance"),
        idpoints: sum(rows, "idpoints_balance"),
        cashback: sum(rows, "cashback_balance"),
      },
      logs: logs.data ?? [],
    };
  });

export const adminPostLedgerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        transactionType: z.string().min(2).max(48),
        currency: z.enum(["pi", "idpoints", "cashback"]),
        amount: z.number().finite(),
        description: z.string().max(240).optional(),
        status: z.enum(["pending", "success"]).default("success"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ledgerId, error } = await supabaseAdmin.rpc("post_ledger_entry", {
      _user_id: data.userId,
      _transaction_type: data.transactionType,
      _currency: data.currency,
      _amount: data.amount,
      _description: data.description,
      _status: data.status,

    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_logs").insert({
      admin_id: context.userId,
      activity: `ledger:${data.transactionType}`,
      metadata: { ...data, ledgerId },
    });

    return { ledgerId };
  });

export const adminSettleLedgerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        ledgerId: z.string().uuid(),
        status: z.enum(["success", "cancelled", "failed"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.rpc("settle_ledger_entry", {
      _ledger_id: data.ledgerId,
      _status: data.status,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_logs").insert({
      admin_id: context.userId,
      activity: `ledger:settle:${data.status}`,
      metadata: { ledgerId: data.ledgerId },
    });

    return { ok: true };
  });

export const adminCreateNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().min(2).max(120),
        message: z.string().min(2).max(1000),
        targetRole: z.enum(["user", "merchant", "admin"]).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { error } = await context.supabase.from("notifications").insert({
      title: data.title,
      message: data.message,
      target_role: data.targetRole,
    });
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_logs").insert({
      admin_id: context.userId,
      activity: "notification:create",
      metadata: { title: data.title },
    });
    return { ok: true };
  });

export const adminCreateRunningText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ message: z.string().min(2).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { error } = await context.supabase.from("running_text").insert({ message: data.message });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCreateBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().min(2).max(120),
        description: z.string().max(300).optional(),
        image: z.string().url().max(500).optional(),
        link: z.string().url().max(500).optional(),
        orderNumber: z.number().int().min(0).max(999).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { error } = await context.supabase.from("banners").insert({
      title: data.title,
      description: data.description ?? null,
      image: data.image ?? null,
      link: data.link ?? null,
      order_number: data.orderNumber,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Admin: backend configuration & reconciliation ---------------- */

export const adminGetBackendConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    const { describeSecrets } = await import("@/lib/app-secrets.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [secrets, runs, openPayments, recentEvents] = await Promise.all([
      describeSecrets(),
      supabaseAdmin
        .from("reconciliation_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .in("status", ["created", "approved", "pending"]),
      supabaseAdmin
        .from("pi_payment_events")
        .select("id, payment_id, event, status, source, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    return {
      secrets,
      runs: runs.data ?? [],
      openPayments: openPayments.count ?? 0,
      events: recentEvents.data ?? [],
      network: String(process.env["PI_SANDBOX"] ?? "true").toLowerCase() === "true" ? "testnet" : "mainnet",
    };
  });

export const adminSaveSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        key: z.enum(["PI_NETWORK_API_KEY", "PI_VALIDATION_KEY"]),
        value: z.string().min(16).max(512),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { setServerSecret } = await import("@/lib/app-secrets.server");
    const { masked } = await setServerSecret(data.key, data.value, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_logs").insert({
      admin_id: context.userId,
      activity: `secret:update:${data.key}`,
      metadata: { key: data.key, masked },
    });
    return { ok: true, masked };
  });

export const adminDeleteSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ key: z.enum(["PI_NETWORK_API_KEY", "PI_VALIDATION_KEY"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const { deleteServerSecret } = await import("@/lib/app-secrets.server");
    await deleteServerSecret(data.key);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_logs").insert({
      admin_id: context.userId,
      activity: `secret:delete:${data.key}`,
      metadata: { key: data.key },
    });
    return { ok: true };
  });

export const adminRunReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    const { reconcilePiPayments } = await import("@/lib/pi-reconcile.server");
    const result = await reconcilePiPayments("admin");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_logs").insert({
      admin_id: context.userId,
      activity: "reconciliation:run",
      metadata: {
        scanned: result.scanned,
        updated: result.updated,
        settled: result.settled,
        failed: result.failed,
      },
    });
    return {
      scanned: result.scanned,
      updated: result.updated,
      settled: result.settled,
      failed: result.failed,
    };
  });
