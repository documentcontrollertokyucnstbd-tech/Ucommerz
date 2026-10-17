import { NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter.
 * Per server instance (fine for a single node / dev). For multi-instance
 * production deployments swap the Map for Redis / Upstash with the same API.
 */
type Entry = { hits: number[] };
const store = new Map<string, Entry>();

export type RateLimitOptions = { max?: number; windowMs?: number };
export type RateLimitResult = { success: boolean; remaining: number; resetAt: number; limit: number };

export function rateLimit(key: string, options: RateLimitOptions = {}): RateLimitResult {
  const max = options.max ?? Number(process.env.RATE_LIMIT_MAX ?? 30);
  const windowMs = options.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW ?? 60_000);
  const now = Date.now();
  const entry = store.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((t) => now - t < windowMs);

  if (entry.hits.length >= max) {
    store.set(key, entry);
    const oldest = entry.hits[0] ?? now;
    return { success: false, remaining: 0, resetAt: oldest + windowMs, limit: max };
  }

  entry.hits.push(now);
  store.set(key, entry);

  // opportunistic cleanup
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (v.hits.every((t) => now - t >= windowMs)) store.delete(k);
    }
  }
  return { success: true, remaining: max - entry.hits.length, resetAt: now + windowMs, limit: max };
}

export function getClientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

/** For Route Handlers: returns a 429 NextResponse when limited, otherwise null. */
export function enforceRateLimit(request: Request, name: string, options: RateLimitOptions = {}): NextResponse | null {
  const ip = getClientIp(request.headers);
  const res = rateLimit(`${name}:${ip}`, options);
  if (res.success) return null;
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((res.resetAt - Date.now()) / 1000))),
        "X-RateLimit-Limit": String(res.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
