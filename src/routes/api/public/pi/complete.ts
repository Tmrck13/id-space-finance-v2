import { createFileRoute } from "@tanstack/react-router";
import { PiPlatform, PiPlatformError } from "@/lib/pi-platform.server";
import { PurchaseStore, RewardStore } from "@/lib/pi-store.server";
import { getProduct } from "@/lib/pi-products";

/** POST /api/public/pi/complete  body: { paymentId, txid } */
export const Route = createFileRoute("/api/public/pi/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { paymentId?: string; txid?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const { paymentId, txid } = body;
        if (!paymentId || !txid) {
          return Response.json({ ok: false, error: "Missing paymentId or txid" }, { status: 400 });
        }
        const record = PurchaseStore.get(paymentId);
        if (!record) {
          return Response.json({ ok: false, error: "Unknown paymentId" }, { status: 404 });
        }
        try {
          const remote = await PiPlatform.completePayment(paymentId, txid);
          if (!remote.status?.transaction_verified) {
            PurchaseStore.update(paymentId, { status: "error", txid });
            return Response.json(
              { ok: false, error: "Transaction not verified by Pi Network" },
              { status: 400 },
            );
          }
          const product = getProduct(record.productId);
          if (!record.rewardGranted) {
            if (product?.reward.idpoints) {
              RewardStore.grantIdpoints(record.userUid, product.reward.idpoints);
            }
            PurchaseStore.update(paymentId, {
              status: "completed",
              txid,
              rewardGranted: true,
            });
          } else {
            PurchaseStore.update(paymentId, { status: "completed", txid });
          }
          const { settlePiPayment } = await import("@/lib/pi-db.server");
          await settlePiPayment({
            paymentId,
            txid,
            status: "completed",
            idpointsReward: product?.reward.idpoints,
            productId: record.productId,
          });
          const balance = RewardStore.getBalance(record.userUid);
          return Response.json({
            ok: true,
            paymentId,
            txid,
            status: "completed",
            reward: { idpoints: balance.idpoints },
          });
        } catch (err) {
          const status = err instanceof PiPlatformError ? err.status : 500;
          const message = err instanceof Error ? err.message : "Completion failed";
          return Response.json({ ok: false, error: message }, { status });
        }
      },
    },
  },
});