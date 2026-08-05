/**
 * In-memory purchase & reward ledger — server only.
 *
 * NOTE: This is intentionally in-memory so the app runs on Testnet
 * without requiring a database. When Lovable Cloud (Postgres) is
 * enabled, swap the impl below for a Supabase-backed adapter with
 * the exact same interface — no call sites need to change.
 */

export type PurchaseStatus =
  | "created"
  | "approved"
  | "completed"
  | "cancelled"
  | "error";

export interface PurchaseRecord {
  paymentId: string;
  userUid: string;
  username?: string;
  productId: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  status: PurchaseStatus;
  txid?: string;
  rewardGranted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RewardBalance {
  userUid: string;
  idpoints: number;
  updatedAt: string;
}

// Use globalThis so hot-reload / multiple imports share the same store.
type Store = {
  purchases: Map<string, PurchaseRecord>;
  balances: Map<string, RewardBalance>;
};
const g = globalThis as unknown as { __idpiStore?: Store };
if (!g.__idpiStore) {
  g.__idpiStore = { purchases: new Map(), balances: new Map() };
}
const store = g.__idpiStore;

export const PurchaseStore = {
  get(paymentId: string): PurchaseRecord | undefined {
    return store.purchases.get(paymentId);
  },
  upsert(rec: PurchaseRecord): PurchaseRecord {
    store.purchases.set(rec.paymentId, rec);
    return rec;
  },
  update(paymentId: string, patch: Partial<PurchaseRecord>): PurchaseRecord | undefined {
    const existing = store.purchases.get(paymentId);
    if (!existing) return undefined;
    const merged: PurchaseRecord = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    store.purchases.set(paymentId, merged);
    return merged;
  },
  listByUser(userUid: string): PurchaseRecord[] {
    return Array.from(store.purchases.values())
      .filter((p) => p.userUid === userUid)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
};

export const RewardStore = {
  getBalance(userUid: string): RewardBalance {
    return (
      store.balances.get(userUid) ?? {
        userUid,
        idpoints: 0,
        updatedAt: new Date().toISOString(),
      }
    );
  },
  grantIdpoints(userUid: string, amount: number): RewardBalance {
    const current = this.getBalance(userUid);
    const next: RewardBalance = {
      userUid,
      idpoints: current.idpoints + amount,
      updatedAt: new Date().toISOString(),
    };
    store.balances.set(userUid, next);
    return next;
  },
};