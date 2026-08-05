/**
 * Pi Products — central product catalog for U2A purchases.
 *
 * Add new products here. Each product declares its Pi price, memo,
 * and reward metadata. Keeping this server + client shared makes it
 * trivial to plug new SKUs into the Premium Store or future modules
 * (VIP Membership, Themes, Marketplace Purchases, Mining Boost, etc.).
 */

export type PiProductKind =
  | "idpoints"
  | "vip_membership"
  | "premium_theme"
  | "marketplace_item"
  | "mining_boost";

export interface PiProduct {
  id: string;
  name: string;
  description: string;
  amount: number; // Pi amount
  memo: string;
  kind: PiProductKind;
  reward: {
    /** IDPoints granted after successful payment (if applicable). */
    idpoints?: number;
    /** Duration in days for time-bound rewards (VIP, boost). */
    durationDays?: number;
  };
  metadata: Record<string, unknown>;
}

export const PI_PRODUCTS: Record<string, PiProduct> = {
  idpoints_starter: {
    id: "idpoints_starter",
    name: "IDPoints Starter Pack",
    description: "Kickstart your journey with 100 IDPoints.",
    amount: 0.01,
    memo: "Purchase IDPoints Starter Pack",
    kind: "idpoints",
    reward: { idpoints: 100 },
    metadata: { type: "idpoints", amount: 100 },
  },
};

export function getProduct(id: string): PiProduct | undefined {
  return PI_PRODUCTS[id];
}