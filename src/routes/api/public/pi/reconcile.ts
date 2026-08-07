import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/pi/reconcile
 *
 * Scheduled reconciliation sweep for open Pi payments. Called by pg_cron with
 * the project's publishable key in the `apikey` header; unauthenticated
 * callers are rejected. Returns only aggregate counters — no user data.
 */
export const Route = createFileRoute("/api/public/pi/reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || apiKey !== expected) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        try {
          const { reconcilePiPayments } = await import("@/lib/pi-reconcile.server");
          const result = await reconcilePiPayments("cron");
          return Response.json({
            ok: true,
            scanned: result.scanned,
            updated: result.updated,
            settled: result.settled,
            failed: result.failed,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Reconciliation failed";
          console.error("[pi-reconcile] sweep failed", err);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
