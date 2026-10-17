/**
 * Canonical site origin, e.g. "https://ucommerz.com". Never throws: a missing, empty or scheme-less
 * NEXT_PUBLIC_APP_URL (a common deployment typo) is repaired instead of crashing `next build`.
 */
export function getSiteUrl(): string {
  let raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (!raw) raw = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "").trim();
  if (!raw) raw = "http://localhost:3000";
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}
