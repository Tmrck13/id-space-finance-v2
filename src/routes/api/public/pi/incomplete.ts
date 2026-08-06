import { createFileRoute } from "@tanstack/react-router";
import { PiPlatform, PiPlatformError } from "@/lib/pi-platform.server";
import { PurchaseStore, RewardStore } from "@/lib/pi-store.server";
import { getProduct } from "@/lib/pi-products";

/** POST /api/public/pi/incomplete  body: { paymentId, txid? } */
export const Route = createFileRoute("/api/public/pi/incomplete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { paymentId?: string; txid?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const { paymentId } = body;
        let { txid } = body;
        if (!paymentId) {
          return Response.json({ ok: false, error: "Missing paymentId" }, { status: 400 });
        }
        try {
          const remote = await PiPlatform.getPayment(paymentId);
          txid = txid ?? remote.transaction?.txid;
          if (!txid) {
            return Response.json(
              { ok: false, error: "Incomplete payment has no txid yet", status: remote.status },
              { status: 409 },
            );
          }
          const completed = await PiPlatform.completePayment(paymentId, txid);
          if (!completed.status.transaction_verified) {
            return Response.json({ ok: false, error: "Transaction not verified" }, { status: 400 });
          }
          const record = PurchaseStore.get(paymentId);
          if (record && !record.rewardGranted) {
            const product = getProduct(record.productId);
            if (product?.reward.idpoints) {
              RewardStore.grantIdpoints(record.userUid, product.reward.idpoints);
            }
            PurchaseStore.update(paymentId, {
              status: "completed",
              txid,
              rewardGranted: true,
            });
            const { settlePiPayment } = await import("@/lib/pi-db.server");
            await settlePiPayment({
              paymentId,
              txid,
              status: "completed",
              idpointsReward: product?.reward.idpoints,
              productId: record.productId,
            });
          }
          return Response.json({ ok: true, paymentId, txid, status: "completed" });
        } catch (err) {
          const status = err instanceof PiPlatformError ? err.status : 500;
          const message = err instanceof Error ? err.message : "Failed to resume payment";
          return Response.json({ ok: false, error: message }, { status });
        }
      },
    },
  },
});