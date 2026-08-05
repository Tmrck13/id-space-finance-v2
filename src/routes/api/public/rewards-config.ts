import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/public/rewards-config
 *
 * Configurable 7-day daily check-in reward table.
 * Values can be overridden via env vars (comma-separated), otherwise
 * fall back to the documented IDPI cycle totalling 9,000 IDPoints ≈ Rp1,000.
 */
export const Route = createFileRoute("/api/public/rewards-config")({
  server: {
    handlers: {
      GET: async () => {
        const DEFAULTS = [180, 360, 540, 900, 1350, 2070, 3600];
        const raw = process.env.CHECKIN_REWARDS;
        let table = DEFAULTS;
        if (raw) {
          const parsed = raw.split(",").map((n) => parseInt(n.trim(), 10));
          if (parsed.length === 7 && parsed.every((n) => Number.isFinite(n) && n > 0)) {
            table = parsed;
          }
        }
        return Response.json({
          ok: true,
          currency: "IDPoints",
          idpointsPerIdr: 9,
          cycleDays: 7,
          rewards: table,
          total: table.reduce((a, b) => a + b, 0),
          updatedAt: new Date().toISOString(),
        });
      },
    },
  },
});