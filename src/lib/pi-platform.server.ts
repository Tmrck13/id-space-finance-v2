/**
 * Pi Platform API client — server only.
 *
 * Wraps the two U2A endpoints we need:
 *   POST /v2/payments/{paymentId}/approve
 *   POST /v2/payments/{paymentId}/complete   { txid }
 *   GET  /v2/payments/{paymentId}
 *
 * Auth: `Key <PI_NETWORK_API_KEY>` header. If the key is missing the
 * helpers throw a typed error so callers can degrade gracefully
 * without crashing the app.
 */

const BASE_URL = "https://api.minepi.com";

export class PiPlatformError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

async function getApiKey(): Promise<string> {
  const { getServerSecret } = await import("./app-secrets.server");
  const key = await getServerSecret("PI_NETWORK_API_KEY");
  if (!key) {
    throw new PiPlatformError(
      "PI_NETWORK_API_KEY is not configured on the server.",
      503,
    );
  }
  return key;
}

async function piFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const key = await getApiKey();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const msg =
        (json && typeof json === "object" && "error" in json
          ? String((json as { error: unknown }).error)
          : `Pi Platform ${res.status}`) || `Pi Platform ${res.status}`;
      throw new PiPlatformError(msg, res.status);
    }
    return json;
  } catch (err) {
    if (err instanceof PiPlatformError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new PiPlatformError("Pi Platform request timed out", 504);
    }
    throw new PiPlatformError(
      err instanceof Error ? err.message : "Pi Platform request failed",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface PiPaymentDTO {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | { txid: string; verified: boolean; _link: string };
}

export const PiPlatform = {
  async getPayment(paymentId: string): Promise<PiPaymentDTO> {
    return (await piFetch(`/v2/payments/${paymentId}`, { method: "GET" })) as PiPaymentDTO;
  },
  async approvePayment(paymentId: string): Promise<PiPaymentDTO> {
    return (await piFetch(`/v2/payments/${paymentId}/approve`, { method: "POST" })) as PiPaymentDTO;
  },
  async completePayment(paymentId: string, txid: string): Promise<PiPaymentDTO> {
    return (await piFetch(`/v2/payments/${paymentId}/complete`, {
      method: "POST",
      body: JSON.stringify({ txid }),
    })) as PiPaymentDTO;
  },
  async cancelPayment(paymentId: string): Promise<PiPaymentDTO> {
    return (await piFetch(`/v2/payments/${paymentId}/cancel`, { method: "POST" })) as PiPaymentDTO;
  },
  async isConfigured(): Promise<boolean> {
    const { getServerSecret } = await import("./app-secrets.server");
    return !!(await getServerSecret("PI_NETWORK_API_KEY"));
  },

};