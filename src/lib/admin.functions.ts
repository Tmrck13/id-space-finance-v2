/**
 * Admin Dashboard — typed server functions.
 *
 * Every function here re-verifies the caller's role SERVER-SIDE through the
 * existing `is_admin()` / `is_moderator()` security-definer helpers before it
 * touches data. Frontend route guards are treated as cosmetic only.
 *
 * Reuses the existing architecture — no new auth system, no new role table,
 * no second ledger. Balance mutations still go exclusively through
 * `post_ledger_entry` / `settle_ledger_entry` (see idpi.functions.ts).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Rpc = { rpc: (fn: "is_admin" | "is_moderator") => PromiseLike<{ data: unknown }> };

/** Admin only. */
async function assertAdmin(supabase: Rpc) {
  const { data } = await supabase.rpc("is_admin");
  if (data !== true) throw new Error("Forbidden");
}

/** Admin or moderator (content/moderation scope). */
async function assertStaff(supabase: Rpc) {
  const { data } = await supabase.rpc("is_moderator");
  if (data !== true) throw new Error("Forbidden");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Meta = Record<string, string | number | boolean | null | undefined>;

async function logActivity(adminId: string, activity: string, metadata: Meta = {}) {
  const db = await admin();
  await db.from("admin_logs").insert({ admin_id: adminId, activity, metadata: metadata as never });
}

/* ---------------------------------------------------------------- bootstrap */

/** Who am I, and what may I see? Drives the admin layout + route gating. */
export const adminBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
      supabase.rpc("is_admin"),
      supabase.rpc("is_moderator"),
    ]);
    if (isModerator !== true && isAdmin !== true) throw new Error("Forbidden");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, email, avatar, membership_level, created_at")
      .eq("id", userId)
      .maybeSingle();

    const db = await admin();
    const { count: alerts } = await db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    return {
      userId,
      role: isAdmin === true ? ("admin" as const) : ("moderator" as const),
      profile: profile ?? null,
      activeNotifications: alerts ?? 0,
    };
  });

/* ---------------------------------------------------------------- dashboard */

export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase);
    const db = await admin();

    const since24h = new Date(Date.now() - 86_400_000).toISOString();
    const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const head = (q: PromiseLike<{ count: number | null }>) => q;

    const [
      users,
      activeUsers,
      piTx,
      piPending,
      piCompleted,
      walletActivity,
      orders,
      wallets,
      recentTx,
      recentLogs,
      lastRun,
      openPayments,
    ] = await Promise.all([
      head(db.from("profiles").select("*", { count: "exact", head: true })),
      head(db.from("profiles").select("*", { count: "exact", head: true }).gte("updated_at", since7d)),
      head(db.from("transactions").select("*", { count: "exact", head: true })),
      head(
        db
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .in("status", ["created", "approved", "pending"]),
      ),
      head(db.from("transactions").select("*", { count: "exact", head: true }).eq("status", "completed")),
      head(db.from("ledger").select("*", { count: "exact", head: true }).gte("created_at", since24h)),
      head(db.from("user_entitlements").select("*", { count: "exact", head: true })),
      db.from("wallets").select("pi_balance, idpoints_balance, cashback_balance"),
      db
        .from("transactions")
        .select("id, payment_id, amount_pi, status, network, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(10),
      db.from("admin_logs").select("id, activity, metadata, created_at, admin_id").order("created_at", { ascending: false }).limit(10),
      db.from("reconciliation_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
      head(
        db
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .in("status", ["created", "approved", "pending"]),
      ),
    ]);

    const rows = wallets.data ?? [];
    const sum = (k: "pi_balance" | "idpoints_balance" | "cashback_balance") =>
      rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);

    return {
      cards: {
        totalUsers: users.count ?? 0,
        activeUsers: activeUsers.count ?? 0,
        piTransactions: piTx.count ?? 0,
        pendingPayments: piPending.count ?? 0,
        completedPayments: piCompleted.count ?? 0,
        totalIdpoints: sum("idpoints_balance"),
        totalPi: sum("pi_balance"),
        totalCashback: sum("cashback_balance"),
        walletActivity24h: walletActivity.count ?? 0,
        marketplaceOrders: orders.count ?? 0,
      },
      systemStatus: {
        openPayments: openPayments.count ?? 0,
        lastReconciliation: lastRun.data?.started_at ?? null,
        lastReconciliationFailed: lastRun.data?.failed ?? null,
        network:
          String(process.env["PI_SANDBOX"] ?? "true").toLowerCase() === "true" ? "testnet" : "mainnet",
      },
      recentTransactions: recentTx.data ?? [],
      recentActivity: recentLogs.data ?? [],
    };
  });

/* ---------------------------------------------------------------- users */

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().max(120).optional(),
        role: z.enum(["all", "user", "merchant", "moderator", "admin"]).default("all"),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const db = await admin();

    let query = db
      .from("profiles")
      .select("id, username, email, avatar, membership_level, pi_uid, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.search?.trim()) {
      const s = data.search.trim().replace(/[%,]/g, "");
      query = query.or(`username.ilike.%${s}%,email.ilike.%${s}%,pi_uid.ilike.%${s}%`);
    }

    const [{ data: profiles, error }, { data: roleRows }] = await Promise.all([
      query,
      db.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error(error.message);

    const roleMap = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(String(r.role));
      roleMap.set(r.user_id, list);
    }

    const enriched = (profiles ?? []).map((p) => ({
      ...p,
      roles: roleMap.get(p.id) ?? ["user"],
      signedInWithPi: !!p.pi_uid,
    }));

    return {
      users:
        data.role === "all" ? enriched : enriched.filter((u) => u.roles.includes(data.role)),
      roleCounts: {
        user: (roleRows ?? []).filter((r) => r.role === "user").length,
        merchant: (roleRows ?? []).filter((r) => r.role === "merchant").length,
        moderator: (roleRows ?? []).filter((r) => r.role === "moderator").length,
        admin: (roleRows ?? []).filter((r) => r.role === "admin").length,
      },
    };
  });

/* ---------------------------------------------------------------- roles */

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["user", "merchant", "moderator", "admin"]),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Only admins may change roles — never moderators, never self-elevation.
    await assertAdmin(context.supabase);
    if (data.userId === context.userId) {
      throw new Error("You cannot change your own role.");
    }
    const db = await admin();

    if (data.grant) {
      const { error } = await db
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      if (data.role === "admin") {
        const { count } = await db
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count ?? 0) <= 1) throw new Error("At least one administrator must remain.");
      }
      const { error } = await db
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }

    await logActivity(context.userId, `role:${data.grant ? "grant" : "revoke"}:${data.role}`, {
      userId: data.userId,
    });
    return { ok: true };
  });

export const adminSetMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), level: z.string().min(2).max(32) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const db = await admin();
    const { error } = await db
      .from("profiles")
      .update({ membership_level: data.level })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logActivity(context.userId, "membership:update", data);
    return { ok: true };
  });

export const adminListMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase);
    const db = await admin();
    const [levels, distribution] = await Promise.all([
      db.from("membership").select("*").order("order_number"),
      db.from("profiles").select("membership_level"),
    ]);
    const counts = new Map<string, number>();
    for (const r of distribution.data ?? []) {
      const k = String(r.membership_level);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return {
      levels: (levels.data ?? []).map((l) => ({ ...l, members: counts.get(l.level) ?? 0 })),
    };
  });

/* ---------------------------------------------------------------- wallets / idpoints / finance */

export const adminListWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const db = await admin();
    const [wallets, profiles] = await Promise.all([
      db
        .from("wallets")
        .select("id, user_id, pi_balance, idpoints_balance, cashback_balance, updated_at")
        .order("idpoints_balance", { ascending: false })
        .limit(data.limit),
      db.from("profiles").select("id, username, email"),
    ]);
    const names = new Map((profiles.data ?? []).map((p) => [p.id, p.username ?? p.email ?? p.id]));
    return {
      wallets: (wallets.data ?? []).map((w) => ({ ...w, owner: names.get(w.user_id) ?? w.user_id })),
    };
  });

export const adminListLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        currency: z.enum(["all", "pi", "idpoints", "cashback"]).default("all"),
        status: z.enum(["all", "pending", "success", "cancelled", "failed"]).default("all"),
        limit: z.number().int().min(1).max(200).default(60),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    const db = await admin();

    let q = db
      .from("ledger")
      .select("id, wallet_id, transaction_type, currency, amount, description, status, reference, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.currency !== "all") q = q.eq("currency", data.currency);
    if (data.status !== "all") q = q.eq("status", data.status);

    const { data: entries, error } = await q;
    if (error) throw new Error(error.message);

    const walletIds = [...new Set((entries ?? []).map((e) => e.wallet_id))];
    const { data: wallets } = walletIds.length
      ? await db.from("wallets").select("id, user_id").in("id", walletIds)
      : { data: [] };
    const userIds = [...new Set((wallets ?? []).map((w) => w.user_id))];
    const { data: profiles } = userIds.length
      ? await db.from("profiles").select("id, username, email").in("id", userIds)
      : { data: [] };

    const walletOwner = new Map((wallets ?? []).map((w) => [w.id, w.user_id]));
    const names = new Map((profiles ?? []).map((p) => [p.id, p.username ?? p.email ?? p.id]));

    return {
      entries: (entries ?? []).map((e) => {
        const uid = walletOwner.get(e.wallet_id);
        return { ...e, userId: uid ?? null, owner: uid ? names.get(uid) ?? uid : "—" };
      }),
    };
  });

export const adminIdpointsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    const db = await admin();
    const [events, wallets, byType] = await Promise.all([
      db
        .from("idpoints")
        .select("id, user_id, event_type, amount, source, description, created_at")
        .order("created_at", { ascending: false })
        .limit(60),
      db.from("wallets").select("idpoints_balance"),
      db.from("ledger").select("transaction_type, amount, currency").eq("currency", "idpoints").limit(1000),
    ]);

    const flows = new Map<string, { credit: number; debit: number }>();
    for (const r of byType.data ?? []) {
      const k = String(r.transaction_type);
      const cur = flows.get(k) ?? { credit: 0, debit: 0 };
      const amt = Number(r.amount ?? 0);
      if (amt >= 0) cur.credit += amt;
      else cur.debit += Math.abs(amt);
      flows.set(k, cur);
    }

    return {
      circulating: (wallets.data ?? []).reduce((a, w) => a + Number(w.idpoints_balance ?? 0), 0),
      events: events.data ?? [],
      flows: [...flows.entries()].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.credit - a.credit),
    };
  });

export const adminFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    const db = await admin();
    const [ledger, tx, entitlements] = await Promise.all([
      db.from("ledger").select("currency, amount, status, created_at").limit(5000),
      db.from("transactions").select("direction, amount_pi, status, created_at").limit(5000),
      db.from("user_entitlements").select("kind, quantity, created_at").limit(2000),
    ]);

    const day = (iso: string) => iso.slice(0, 10);
    const series = new Map<string, { day: string; pi: number; idpoints: number }>();
    for (const r of ledger.data ?? []) {
      if (r.status !== "success") continue;
      const d = day(String(r.created_at));
      const cur = series.get(d) ?? { day: d, pi: 0, idpoints: 0 };
      if (r.currency === "pi") cur.pi += Number(r.amount ?? 0);
      if (r.currency === "idpoints") cur.idpoints += Number(r.amount ?? 0);
      series.set(d, cur);
    }

    const piIn = (tx.data ?? [])
      .filter((t) => t.direction === "user_to_app" && t.status === "completed")
      .reduce((a, t) => a + Number(t.amount_pi ?? 0), 0);
    const piOut = (tx.data ?? [])
      .filter((t) => t.direction === "app_to_user" && t.status === "completed")
      .reduce((a, t) => a + Number(t.amount_pi ?? 0), 0);

    return {
      piIn,
      piOut,
      net: piIn - piOut,
      entitlements: entitlements.data?.length ?? 0,
      series: [...series.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-30),
    };
  });

/* ---------------------------------------------------------------- payments */

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.string().max(32).default("all"),
        search: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const db = await admin();

    let q = db
      .from("transactions")
      .select(
        "id, user_id, payment_id, txid, direction, amount_pi, product_id, memo, network, status, created_at, settled_at, reconciled_at, attempts, last_error",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.search?.trim()) {
      const s = data.search.trim().replace(/[%,]/g, "");
      q = q.or(`payment_id.ilike.%${s}%,txid.ilike.%${s}%`);
    }

    const { data: payments, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = [...new Set((payments ?? []).map((p) => p.user_id))];
    const [{ data: profiles }, runs, events] = await Promise.all([
      userIds.length
        ? db.from("profiles").select("id, username, email").in("id", userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; username: string | null; email: string | null }> }),
      db.from("reconciliation_runs").select("*").order("started_at", { ascending: false }).limit(10),
      db
        .from("pi_payment_events")
        .select("id, payment_id, event, status, source, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    const names = new Map((profiles ?? []).map((p) => [p.id, p.username ?? p.email ?? p.id]));

    return {
      payments: (payments ?? []).map((p) => ({ ...p, owner: names.get(p.user_id) ?? p.user_id })),
      runs: runs.data ?? [],
      events: events.data ?? [],
    };
  });

/* ---------------------------------------------------------------- marketplace / rewards / missions */

export const adminMarketplaceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase);
    const db = await admin();
    const [entitlements, profiles] = await Promise.all([
      db
        .from("user_entitlements")
        .select("id, user_id, product_id, kind, quantity, source_payment_id, expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(60),
      db.from("profiles").select("id, username, email"),
    ]);
    const names = new Map((profiles.data ?? []).map((p) => [p.id, p.username ?? p.email ?? p.id]));
    return {
      orders: (entitlements.data ?? []).map((e) => ({ ...e, owner: names.get(e.user_id) ?? e.user_id })),
    };
  });

export const adminRewardsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase);
    const db = await admin();
    const [rewards, checkins, profiles] = await Promise.all([
      db
        .from("rewards")
        .select("id, user_id, reward_type, amount, source, created_at")
        .order("created_at", { ascending: false })
        .limit(60),
      db
        .from("daily_checkin")
        .select("id, user_id, checkin_date, streak, reward_currency, reward_amount")
        .order("checkin_date", { ascending: false })
        .limit(30),
      db.from("profiles").select("id, username, email"),
    ]);
    const names = new Map((profiles.data ?? []).map((p) => [p.id, p.username ?? p.email ?? p.id]));
    return {
      rewards: (rewards.data ?? []).map((r) => ({ ...r, owner: names.get(r.user_id) ?? r.user_id })),
      checkins: (checkins.data ?? []).map((c) => ({ ...c, owner: names.get(c.user_id) ?? c.user_id })),
    };
  });

export const adminListMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase);
    const db = await admin();
    const [missions, progress] = await Promise.all([
      db.from("missions").select("*").order("order_number"),
      db.from("user_missions").select("mission_id, completed_at, claimed_at"),
    ]);
    const stats = new Map<string, { started: number; completed: number; claimed: number }>();
    for (const p of progress.data ?? []) {
      const cur = stats.get(p.mission_id) ?? { started: 0, completed: 0, claimed: 0 };
      cur.started += 1;
      if (p.completed_at) cur.completed += 1;
      if (p.claimed_at) cur.claimed += 1;
      stats.set(p.mission_id, cur);
    }
    return {
      missions: (missions.data ?? []).map((m) => ({
        ...m,
        stats: stats.get(m.id) ?? { started: 0, completed: 0, claimed: 0 },
      })),
    };
  });

export const adminToggleMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const { error } = await context.supabase
      .from("missions")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(context.userId, `mission:${data.isActive ? "enable" : "disable"}`, { id: data.id });
    return { ok: true };
  });

/* ---------------------------------------------------------------- announcements (banners / ticker / notifications) */

const nullableIso = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const adminListAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase);
    const db = await admin();
    const [banners, runningText, notifications] = await Promise.all([
      db.from("banners").select("*").order("order_number"),
      db.from("running_text").select("*").order("priority", { ascending: false }).order("order_number"),
      db.from("notifications").select("*").order("published_at", { ascending: false }).limit(100),
    ]);
    return {
      banners: banners.data ?? [],
      runningText: runningText.data ?? [],
      notifications: notifications.data ?? [],
    };
  });

export const adminSaveBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(2).max(120),
        description: z.string().max(400).nullable().optional(),
        image: z.string().url().max(600).nullable().optional(),
        link: z.string().url().max(600).nullable().optional(),
        orderNumber: z.number().int().min(0).max(999).default(0),
        isActive: z.boolean().default(true),
        startsAt: nullableIso,
        endsAt: nullableIso,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const row = {
      title: data.title,
      description: data.description ?? null,
      image: data.image ?? null,
      link: data.link ?? null,
      order_number: data.orderNumber,
      is_active: data.isActive,
      starts_at: data.startsAt ?? null,
      ends_at: data.endsAt ?? null,
    };
    const q = data.id
      ? context.supabase.from("banners").update(row).eq("id", data.id)
      : context.supabase.from("banners").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logActivity(context.userId, `banner:${data.id ? "update" : "create"}`, { title: data.title });
    return { ok: true };
  });

export const adminSaveRunningText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        message: z.string().min(2).max(400),
        lang: z.string().min(2).max(8).default("all"),
        priority: z.number().int().min(0).max(999).default(0),
        orderNumber: z.number().int().min(0).max(999).default(0),
        isActive: z.boolean().default(true),
        startsAt: nullableIso,
        endsAt: nullableIso,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const row = {
      message: data.message,
      lang: data.lang,
      priority: data.priority,
      order_number: data.orderNumber,
      is_active: data.isActive,
      starts_at: data.startsAt ?? null,
      ends_at: data.endsAt ?? null,
    };
    const q = data.id
      ? context.supabase.from("running_text").update(row).eq("id", data.id)
      : context.supabase.from("running_text").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logActivity(context.userId, `running_text:${data.id ? "update" : "create"}`, {});
    return { ok: true };
  });

export const adminSaveNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(2).max(160),
        message: z.string().min(2).max(1200),
        lang: z.string().min(2).max(8).default("all"),
        priority: z.number().int().min(0).max(999).default(0),
        targetRole: z.enum(["user", "merchant", "moderator", "admin"]).nullable().default(null),
        isActive: z.boolean().default(true),
        publishedAt: nullableIso,
        expiresAt: nullableIso,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const row = {
      title: data.title,
      message: data.message,
      lang: data.lang,
      priority: data.priority,
      target_role: data.targetRole,
      is_active: data.isActive,
      ...(data.publishedAt ? { published_at: data.publishedAt } : {}),
      expires_at: data.expiresAt ?? null,
    };
    const q = data.id
      ? context.supabase.from("notifications").update(row).eq("id", data.id)
      : context.supabase.from("notifications").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logActivity(context.userId, `notification:${data.id ? "update" : "create"}`, {
      title: data.title,
    });
    return { ok: true };
  });

export const adminToggleAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        table: z.enum(["banners", "running_text", "notifications"]),
        id: z.string().uuid(),
        isActive: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const { error } = await context.supabase
      .from(data.table)
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(context.userId, `${data.table}:${data.isActive ? "enable" : "disable"}`, {
      id: data.id,
    });
    return { ok: true };
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        table: z.enum(["banners", "running_text", "notifications"]),
        id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const { error } = await context.supabase.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(context.userId, `${data.table}:delete`, { id: data.id });
    return { ok: true };
  });

/* ---------------------------------------------------------------- settings (non-secret) */

export const adminListSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    const db = await admin();
    const { data, error } = await db.from("settings").select("*").order("key");
    if (error) throw new Error(error.message);
    return { settings: data ?? [] };
  });

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        key: z
          .string()
          .min(2)
          .max(64)
          .regex(/^[a-z0-9_.]+$/, "Use lowercase letters, numbers, dot or underscore."),
        value: z.string().max(4000),
        description: z.string().max(300).nullable().optional(),
        isPublic: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    // Never allow the settings table to become a plaintext secret store.
    if (/key|secret|token|password/i.test(data.key)) {
      throw new Error("Credentials must be stored in the encrypted vault, not in settings.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.value);
    } catch {
      parsed = data.value;
    }
    const db = await admin();
    const { error } = await db.from("settings").upsert(
      {
        key: data.key,
        value: parsed as never,
        description: data.description ?? null,
        is_public: data.isPublic,
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    await logActivity(context.userId, "setting:update", { key: data.key });
    return { ok: true };
  });

/* ---------------------------------------------------------------- audit logs */

export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(300).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase);
    const db = await admin();

    let q = db
      .from("admin_logs")
      .select("id, admin_id, activity, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.search?.trim()) q = q.ilike("activity", `%${data.search.trim().replace(/[%,]/g, "")}%`);

    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [...new Set((logs ?? []).map((l) => l.admin_id))];
    const { data: profiles } = ids.length
      ? await db.from("profiles").select("id, username, email").in("id", ids)
      : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.username ?? p.email ?? p.id]));

    /** Metadata is scrubbed: encrypted/secret values are never surfaced. */
    const SENSITIVE = /key|secret|token|password|credential|cipher|iv|auth_tag/i;
    const scrub = (meta: unknown): Record<string, string> => {
      if (!meta || typeof meta !== "object") return {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
        if (SENSITIVE.test(k) && k !== "key" && k !== "masked") out[k] = "«redacted»";
        else out[k] = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
      }
      return out;
    };

    return {
      logs: (logs ?? []).map((l) => ({
        id: l.id,
        admin: names.get(l.admin_id) ?? l.admin_id,
        activity: l.activity,
        target: scrub(l.metadata),
        created_at: l.created_at,
      })),
    };
  });
