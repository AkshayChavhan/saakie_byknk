import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';

/**
 * Tagged data cache for reads that rarely change but are hit on every page:
 * categories, hero slides, banners, featured products, store settings.
 *
 * Reads are wrapped with `cached()`, which stores the result in Next's data
 * cache under one or more tags. Admin writes call `invalidate()` with the
 * same tags, so an edit shows on the next request instead of after a timer.
 * Every entry also carries a time-based `revalidate` as a safety net, in
 * case a write path forgets to invalidate.
 *
 * Under Vitest the wrapper is a pass-through: Next's cache needs a request
 * context the tests do not have, and the tests want to see every query.
 */

export const TAG = {
  categories: 'categories',
  products: 'products',
  heroSlides: 'hero-slides',
  promos: 'promotional-banners',
  settings: 'settings',
} as const;

export type CacheTag = (typeof TAG)[keyof typeof TAG];

const BYPASS = process.env.VITEST === 'true';

/** Default time-based fallback when no `revalidate` is given, in seconds. */
export const DEFAULT_REVALIDATE_SECONDS = 300;

export function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  key: string,
  opts: { tags: CacheTag[]; revalidate?: number }
): (...args: A) => Promise<R> {
  if (BYPASS) return fn;
  return unstable_cache(fn, [key], {
    tags: opts.tags,
    revalidate: opts.revalidate ?? DEFAULT_REVALIDATE_SECONDS,
  });
}

/** Drop every cached read carrying any of `tags`. Safe to call anywhere; never throws. */
export function invalidate(...tags: CacheTag[]): void {
  if (BYPASS) return;
  for (const tag of tags) {
    try {
      revalidateTag(tag);
    } catch (error) {
      console.warn(`[cache] could not invalidate "${tag}":`, error);
    }
  }
}
