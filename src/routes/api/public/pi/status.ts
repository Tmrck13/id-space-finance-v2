import { createFileRoute } from "@tanstack/react-router";
import { PurchaseStore, RewardStore } from "@/lib/pi-store.server";

/** GET /api/public/pi/status?paymentId=... | ?userUid=... */
export const Route = createFileRoute("/api/public/pi/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const paymentId = url.searchParams.get("paymentId");
        const userUid = url.searchParams.get("userUid");
        if (paymentId) {
          const rec = PurchaseStore.get(paymentId);
          if (!rec) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
          return Response.json({ ok: true, purchase: rec });
        }
        if (userUid) {
          return Response.json({
            ok: true,
            purchases: PurchaseStore.listByUser(userUid),
            balance: RewardStore.getBalance(userUid),
          });
        }
        return Response.json({ ok: false, error: "paymentId or userUid required" }, { status: 400 });
      },
    },
  },
});