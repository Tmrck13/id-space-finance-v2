/**
 * PiPayments — production client for Pi Network U2A payments (Testnet-ready).
 *
 * Wraps Pi SDK v2 `Pi.createPayment()` and coordinates with our backend
 * endpoints under `/api/public/pi/*`.
 */
import { getProduct, type PiProduct } from "./pi-products";

type PiPaymentDTO = {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  transaction?: { txid: string } | null;
};

interface PiCreatePaymentSDK {
  createPayment: (
    data: { amount: number; memo: string; metadata: Record<string, unknown> },
    callbacks: {
      onReadyForServerApproval: (paymentId: string) => void;
      onReadyForServerCompletion: (paymentId: string, txid: string) => void;
      onCancel: (paymentId: string) => void;
      onError: (error: Error, payment?: PiPaymentDTO) => void;
    },
  ) => Promise<unknown>;
}

function getPi(): PiCreatePaymentSDK | null {
  if (typeof window === "undefined") return null;
  const pi = (window as unknown as { Pi?: PiCreatePaymentSDK }).Pi;
  return pi ?? null;
}

export interface PiPaymentRequest {
  productId: string;
  userUid: string;
  username?: string;
}

export type PiPaymentResult =
  | { status: "completed"; paymentId: string; txid: string; reward?: { idpoints: number } }
  | { status: "cancelled"; paymentId?: string; message: string }
  | { status: "error"; message: string; paymentId?: string };

export type PiPurchaseOutcome = PiPaymentResult;

export function isPiBrowser(): boolean {
  return getPi() !== null;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!res.ok || (json as { ok?: boolean }).ok === false) {
    throw new Error((json as { error?: string }).error || `Request failed (${res.status})`);
  }
  return json;
}

/** Resume an incomplete payment via backend. */
export async function resumeIncompletePayment(payment: PiPaymentDTO): Promise<void> {
  try {
    await postJson("/api/public/pi/incomplete", {
      paymentId: payment.identifier,
      txid: payment.transaction?.txid,
    });
  } catch (err) {
    console.warn("[pi-payments] resume failed", err);
  }
}

export const PiPayments = {
  isReady: isPiBrowser,

  async createPayment(req: PiPaymentRequest): Promise<PiPaymentResult> {
    const pi = getPi();
    if (!pi) {
      return { status: "error", message: "Pi SDK unavailable. Open in Pi Browser." };
    }
    const product: PiProduct | undefined = getProduct(req.productId);
    if (!product) return { status: "error", message: "Unknown product" };

    return new Promise<PiPaymentResult>((resolve) => {
      let currentPaymentId: string | undefined;
      let resolved = false;
      const done = (r: PiPaymentResult) => { if (!resolved) { resolved = true; resolve(r); } };

      pi.createPayment(
        { amount: product.amount, memo: product.memo, metadata: product.metadata },
        {
          onReadyForServerApproval: async (paymentId) => {
            currentPaymentId = paymentId;
            try {
              await postJson("/api/public/pi/approve", {
                paymentId,
                productId: product.id,
                userUid: req.userUid,
                username: req.username,
              });
            } catch (err) {
              done({
                status: "error",
                paymentId,
                message: err instanceof Error ? err.message : "Approval failed",
              });
            }
          },
          onReadyForServerCompletion: async (paymentId, txid) => {
            currentPaymentId = paymentId;
            try {
              const res = await postJson<{ ok: true; reward?: { idpoints: number } }>(
                "/api/public/pi/complete",
                { paymentId, txid },
              );
              done({ status: "completed", paymentId, txid, reward: res.reward });
            } catch (err) {
              done({
                status: "error",
                paymentId,
                message: err instanceof Error ? err.message : "Completion failed",
              });
            }
          },
          onCancel: (paymentId) => {
            done({ status: "cancelled", paymentId, message: "Payment cancelled" });
          },
          onError: (error) => {
            done({
              status: "error",
              paymentId: currentPaymentId,
              message: error?.message || "Payment error",
            });
          },
        },
      ).catch((err: unknown) => {
        done({
          status: "error",
          message: err instanceof Error ? err.message : "Payment failed to start",
        });
      });
    });
  },

  async getRewardBalance(userUid: string): Promise<number> {
    try {
      const res = await fetch(`/api/public/pi/rewards?userUid=${encodeURIComponent(userUid)}`);
      const json = (await res.json()) as { ok?: boolean; balance?: { idpoints: number } };
      return json?.balance?.idpoints ?? 0;
    } catch { return 0; }
  },
};

export default PiPayments;