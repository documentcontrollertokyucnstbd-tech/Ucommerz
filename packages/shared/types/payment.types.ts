/**
 * Payment types. v1 has no payments table: bookings carry `total_price` and are
 * settled off-platform. These describe the shape a payment-provider integration
 * (Stripe, SSLCommerz, ...) should adopt later.
 */
export const PAYMENT_STATUSES = ["PENDING", "AUTHORIZED", "PAID", "REFUNDED", "FAILED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["CARD", "BANK_TRANSFER", "MOBILE_WALLET", "CASH"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Payment {
  id: string;
  booking_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider_reference: string | null;
  created_at: string;
}

export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  platformFee: number;
  total: number;
}
