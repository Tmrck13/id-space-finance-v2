/**
 * PaymentService — thin re-export of the production Pi Payments client.
 * Kept for backwards compatibility with existing call sites.
 */
export { PiPayments as PaymentService, PiPayments as default } from "./pi-payments";
export type {
  PiPaymentRequest,
  PiPaymentResult,
  PiPurchaseOutcome,
} from "./pi-payments";