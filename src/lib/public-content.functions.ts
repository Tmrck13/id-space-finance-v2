/**
 * Public announcement reads — banners, running text and system notifications.
 *
 * Public (no bearer token) so SSR/prerender works, and read-only through the
 * publishable key so the existing `TO anon` SELECT policies still apply.
 * Scheduling windows are enforced here: expired / not-yet-started / inactive
 * rows are never returned to the app.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const inWindow = (startsAt: string | null, endsAt: string | null, now: number) =>
  (!startsAt || Date.parse(startsAt) <= now) && (!endsAt || Date.parse(endsAt) > now);

export const getPublicAnnouncements = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ lang: z.string().max(8).default("all") }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const client = await publicClient();
    const now = Date.now();

    const [banners, ticker, notifications] = await Promise.all([
      client
        .from("banners")
        .select("id, image, title, description, link, order_number, starts_at, ends_at")
        .eq("is_active", true)
        .order("order_number"),
      client
        .from("running_text")
        .select("id, message, lang, priority, order_number, starts_at, ends_at")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("order_number"),
      client
        .from("notifications")
        .select("id, title, message, lang, priority, published_at, expires_at, target_role")
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(50),
    ]);

    const langOk = (l: string | null) => !l || l === "all" || l === data.lang;

    return {
      banners: (banners.data ?? []).filter((b) => inWindow(b.starts_at, b.ends_at, now)),
      runningText: (ticker.data ?? [])
        .filter((r) => inWindow(r.starts_at, r.ends_at, now) && langOk(r.lang)),
      notifications: (notifications.data ?? [])
        .filter(
          (n) =>
            langOk(n.lang) &&
            (!n.published_at || Date.parse(n.published_at) <= now) &&
            (!n.expires_at || Date.parse(n.expires_at) > now),
        )
        .map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          at: n.published_at ? Date.parse(n.published_at) : now,
        })),
    };
  });
