import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/errors';
import { checkRateLimit, clientIp } from '@/lib/server/rate-limit';
import { searchSuggestions } from '@/lib/server/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Requests per minute per visitor. Typing is debounced, so this is generous. */
const SUGGEST_RATE_LIMIT = 120;

/**
 * GET /api/search/suggest?q=meh — typeahead for the header search box.
 * Public; returns up to six sarees and three categories.
 */
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    if (!q.trim()) {
      return NextResponse.json({ query: '', products: [], categories: [] });
    }

    const limit = await checkRateLimit(`search-suggest:${clientIp(request)}`, SUGGEST_RATE_LIMIT, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many searches, please slow down' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    return NextResponse.json(await searchSuggestions(q), {
      // Same letters, same answer for a minute at the CDN; never in a browser
      // cache, so a newly listed saree shows up on the next visit.
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300, max-age=0' },
    });
  } catch (error) {
    return apiError(error);
  }
}
