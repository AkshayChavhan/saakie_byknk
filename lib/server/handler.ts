import 'server-only';
import { NextResponse } from 'next/server';
import { apiError } from './errors';

type RouteHandler<Ctx = unknown> = (
  request: Request,
  context: Ctx
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a route handler in try/catch and delegate to `apiError` on failure so
 * every route returns the same JSON shape.
 */
export function withRoute<Ctx = unknown>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      return apiError(err);
    }
  };
}
