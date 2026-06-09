import 'server-only';

/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Intended for protecting expensive endpoints (e.g. the AI chat route, which
 * relays to a paid LLM) from a single client running them in a loop —
 * "denial-of-wallet". It is deliberately dependency-free.
 *
 * Caveats (acceptable for the cost-abuse use case, not for hard security):
 *  - State lives in the Node process memory, so each serverless instance has
 *    its own counters. It throttles a hammering client hitting one instance,
 *    not a distributed flood. For strict global limits, move to Redis/Upstash.
 *  - Counters reset on cold start.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup bound so the map can't grow without limit under churn
// of unique keys (e.g. many distinct IPs).
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets — useful for a Retry-After header. */
  retryAfter: number;
}

/**
 * Record one hit for `key` and report whether it is within `limit` per
 * `windowMs`. The first call in a window starts the clock.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_BUCKETS) {
      // Drop expired entries before inserting a new one.
      Array.from(buckets.entries()).forEach(([k, b]) => {
        if (now >= b.resetAt) buckets.delete(k);
      });
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

/**
 * Best-effort client IP from the standard proxy headers (Vercel sets
 * `x-forwarded-for`). Falls back to a constant so the limiter still functions
 * (all unknown clients share one bucket) rather than failing open per-request.
 */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
