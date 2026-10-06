import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Page paths that are viewable while signed out. API routes are intentionally
 * NOT listed here: they enforce their own auth via `requireAuth()` and must
 * return JSON 401s rather than be redirected to `/sign-in`.
 */
const PUBLIC_PAGES = [
  '/',
  '/products',
  '/categories',
  '/about',
  '/our-story',
  '/blog',
  '/contact',
  '/post',
  '/care-instructions',
  '/shipping-returns',
  '/privacy-policy',
  '/terms-of-service',
  '/return-policy',
  '/disclaimer',
  // Clerk's forms route their own steps beneath these (/sign-in/factor-one,
  // /sign-up/verify-email-address, /sign-in/sso-callback …).
  '/sign-in',
  '/sign-up',
  '/offline', // service-worker offline fallback; must be reachable while signed out
];

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`))
  );
}

function isAdminPage(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Never touch Next.js internals or static assets (CSS/JS/images/fonts).
  // The `config.matcher` below also excludes these, but guarding here too
  // ensures a stylesheet request can never be redirected to /sign-in.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    /\.[\w]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // API routes handle their own auth (JSON responses). Never redirect them.
  // They still pass through this middleware: `auth()` in a route handler only
  // works on requests clerkMiddleware has seen.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const { userId } = await auth();
  const isLoggedIn = !!userId;

  // Admin pages: must be signed in. Role is enforced inside the page/API.
  if (isAdminPage(pathname)) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Other protected pages: redirect to sign-in, preserving the target.
  if (!isPublicPage(pathname) && !isLoggedIn) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Every page and every API route; only static assets are skipped. Nothing
  // under /api may be excluded — a route handler calling `auth()` on a request
  // this middleware never saw throws instead of reporting "signed out".
  //
  // Must be a plain string literal — Next.js parses this statically at build
  // time and cannot evaluate expressions (template tags, concatenation, etc).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.+\\.[\\w]+$).*)'],
};
