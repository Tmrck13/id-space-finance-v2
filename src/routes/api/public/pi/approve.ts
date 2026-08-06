import { createFileRoute } from "@tanstack/react-router";
import { PiPlatform, PiPlatformError } from "@/lib/pi-platform.server";
import { PurchaseStore } from "@/lib/pi-store.server";
import { getProduct } from "@/lib/pi-products";

/**
 * POST /api/public/pi/approve
 * body: { paymentId, productId, userUid, username? }
 */
export const Route = createFileRoute("/api/public/pi/approve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          paymentId?: string;
          productId?: string;
          userUid?: string;
          username?: string;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const { paymentId, productId, userUid, username } = body;
        if (!paymentId || !productId || !userUid) {
          return Response.json(
            { ok: false, error: "Missing paymentId, productId or userUid" },
            { status: 400 },
          );
        }
        const product = getProduct(productId);
        if (!product) {
          return Response.json({ ok: false, error: "Unknown product" }, { status: 404 });
        }
        try {
          const remote = await PiPlatform.getPayment(paymentId);
          if (Math.abs(remote.amount - product.amount) > 1e-9) {
            return Response.json(
              { ok: false, error: "Payment amount mismatch" },
              { status: 400 },
            );
          }
          const now = new Date().toISOString();
          PurchaseStore.upsert({
            paymentId,
            userUid,
            username,
            productId,
            amount: product.amount,
            memo: product.memo,
            metadata: product.metadata,
            status: "created",
            rewardGranted: false,
            createdAt: now,
            updatedAt: now,
          });
          await PiPlatform.approvePayment(paymentId);
          PurchaseStore.update(paymentId, { status: "approved" });
          const { recordPiPayment } = await import("@/lib/pi-db.server");
          await recordPiPayment({
            paymentId,
            piUid: userUid,
            productId,
            amountPi: product.amount,
            memo: product.memo,
            metadata: product.metadata,
            status: "approved",
          });
          return Response.json({ ok: true, paymentId, status: "approved" });
        } catch (err) {
          const status = err instanceof PiPlatformError ? err.status : 500;
          const message = err instanceof Error ? err.message : "Approval failed";
          PurchaseStore.update(paymentId, { status: "error" });
          return Response.json({ ok: false, error: message }, { status });
        }
      },
    },
  },
});