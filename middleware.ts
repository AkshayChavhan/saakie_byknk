import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/products(.*)',
  '/categories(.*)',
  '/api/products(.*)',
  '/api/categories(.*)',
  '/api/auth/check-role',
  '/api/admin/set-admin',
  '/api/webhooks/clerk',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Log webhook requests for debugging
  if (req.nextUrl.pathname === '/api/webhooks/clerk') {
    console.log('Webhook request to middleware:', {
      method: req.method,
      pathname: req.nextUrl.pathname,
      headers: {
        'svix-id': req.headers.get('svix-id'),
        'svix-timestamp': req.headers.get('svix-timestamp'),
        'svix-signature': req.headers.get('svix-signature'),
      }
    });
    // Allow webhook requests to pass through
    return NextResponse.next();
  }

  const { userId, sessionClaims } = await auth()
  
  if (!isPublicRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url)
    return NextResponse.redirect(signInUrl)
  }
  if (isAdminRoute(req)) {
    if (!userId) {
      const url = new URL('/', req.url)
      return NextResponse.redirect(url)
    }

    // For now, allow access to admin routes for authenticated users
    // The admin pages will do their own role checking via API
    // This is a temporary solution until we implement proper role caching
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
}