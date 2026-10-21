import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/errors';
import { parseLimit, parsePage } from '@/lib/server/validation';
import { listCatalogue } from '@/lib/server/catalogue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The shop listing (/products and category pages): filter, sort and page.
 * Served from the cached catalogue in lib/server/catalogue.ts, so a filter
 * change reads no database; the catalogue refreshes on any product or
 * category change.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(
      await listCatalogue({
        category: searchParams.get('category'),
        search: searchParams.get('search'),
        sort: searchParams.get('sort'),
        minPrice: searchParams.get('minPrice'),
        maxPrice: searchParams.get('maxPrice'),
        inStock: searchParams.get('inStock'),
        featured: searchParams.get('featured'),
        sale: searchParams.get('sale'),
        colors: searchParams.get('colors'),
        page: parsePage(searchParams.get('page')),
        limit: parseLimit(searchParams.get('limit'), 12),
      })
    );
  } catch (error) {
    return apiError(error);
  }
}
