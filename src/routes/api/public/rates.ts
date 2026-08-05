import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/public/rates
 *
 * Server-side proxy for market data so the client works reliably in any
 * environment (Pi Browser CORS, offline mode, rate limits).
 *
 * Returns:
 *   { ok, piUsd, usdIdr, change24h, high24h, low24h, vol24h, ts }
 *
 * Sources:
 *   PI/USDT  → OKX  (https://www.okx.com/api/v5/market/ticker?instId=PI-USDT)
 *   USD/IDR  → open.er-api.com  (public, no key)
 */
export const Route = createFileRoute("/api/public/rates")({
  server: {
    handlers: {
      GET: async () => {
        const out = {
          ok: true,
          piUsd: 0,
          usdIdr: 0,
          change24h: 0,
          high24h: 0,
          low24h: 0,
          vol24h: 0,
          ts: Date.now(),
        };

        try {
          const r = await fetch(
            "https://www.okx.com/api/v5/market/ticker?instId=PI-USDT",
            { headers: { accept: "application/json" } },
          );
          const j = (await r.json()) as {
            data?: Array<{
              last?: string; open24h?: string; high24h?: string;
              low24h?: string; vol24h?: string;
            }>;
          };
          const t = j?.data?.[0];
          if (t) {
            const last = parseFloat(t.last ?? "0");
            const open = parseFloat(t.open24h ?? "0");
            out.piUsd = last;
            out.high24h = parseFloat(t.high24h ?? "0");
            out.low24h = parseFloat(t.low24h ?? "0");
            out.vol24h = parseFloat(t.vol24h ?? "0");
            out.change24h = open > 0 ? ((last - open) / open) * 100 : 0;
          }
        } catch {
          out.ok = false;
        }

        try {
          const r = await fetch("https://open.er-api.com/v6/latest/USD", {
            headers: { accept: "application/json" },
          });
          const j = (await r.json()) as { rates?: { IDR?: number } };
          if (j?.rates?.IDR) out.usdIdr = j.rates.IDR;
        } catch {
          out.ok = false;
        }

        return new Response(JSON.stringify(out), {
          status: 200,
          headers: {
            "content-type": "application/json",
            // 30s edge cache is safe; client refreshes every 60s anyway.
            "cache-control": "public, max-age=30, s-maxage=30",
          },
        });
      },
    },
  },
});