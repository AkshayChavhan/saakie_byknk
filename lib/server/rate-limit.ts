import 'server-only';

/**
 * Fixed-window rate limiter with two backends.
 *
 *  - Upstash Redis (REST), when `UPSTASH_REDIS_REST_URL` and
 *    `UPSTASH_REDIS_REST_TOKEN` are set. Counters are shared by every
 *    serverless instance, so the limit is a real global limit.
 *  - In-process memory otherwise. Each instance keeps its own counters and
 *    they reset on cold start, so this only throttles a client hammering one
 *    instance. Fine for local development; weak in production.
 *
 * Use `checkRateLimit` from route handlers — it picks the backend. The
 * synchronous `rateLimit` is the in-memory primitive and stays exported for
 * tests and for callers that must not await.
 *
 * Intended for protecting expensive or sensitive endpoints (the AI chat route,
 * payment confirmation, review submission) from one client running them in a
 * loop. It is not a substitute for a WAF against a distributed flood.
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

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** True when a shared (cross-instance) limiter backend is configured. */
export function hasSharedRateLimiter(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

/**
 * INCR the window counter and set its expiry on first hit, in one pipeline
 * round trip. Returns the count after increment, or null if Upstash could not
 * be reached — the caller then falls back to the in-memory limiter rather
 * than failing open or closed on a network blip.
 */
async function upstashHit(key: string, windowMs: number): Promise<number | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, String(windowMs), 'NX'],
      ]),
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    const count = rows?.[0]?.result;
    return typeof count === 'number' ? count : null;
  } catch (error) {
    console.warn('[rate-limit] Upstash unreachable, using in-memory limiter:', error);
    return null;
  }
}

/**
 * Record one hit for `key` and report whether it is within `limit` per
 * `windowMs`, using the shared backend when configured.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;
  const count = await upstashHit(windowKey, windowMs);
  if (count === null) return rateLimit(key, limit, windowMs, now);

  if (count > limit) {
    const windowEnd = (Math.floor(now / windowMs) + 1) * windowMs;
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((windowEnd - now) / 1000)) };
  }
  return { allowed: true, retryAfter: 0 };
}
