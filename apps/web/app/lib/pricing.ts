import type { PriceUnit } from "@ucommerz/shared";

/**
 * Booking total. Hourly services are billed per hour of `duration`;
 * day / session / project services are a flat price for the booking.
 */
export function computeTotal(price: number | string, unit: PriceUnit | string, duration: number): number {
  const p = Number(price) || 0;
  const d = Number(duration) || 0;
  const total = unit === "hour" ? p * d : p;
  return Math.round(total * 100) / 100;
}

/** Package price: sum of included services × quantity, minus the discount. */
export function computePackagePrice(
  items: { price: number | string; quantity?: number }[],
  discountPercentage: number,
): { subtotal: number; total: number } {
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity ?? 1), 0);
  const total = subtotal * (1 - Math.min(100, Math.max(0, discountPercentage)) / 100);
  return { subtotal: Math.round(subtotal * 100) / 100, total: Math.round(total * 100) / 100 };
}
