import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

// Edge-safe Auth.js instance (authConfig has no Prisma/bcrypt). Used only to
// read the session in middleware — never to run the Credentials provider.
const { auth } = NextAuth(authConfig);

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
  '/sign-in',
  '/sign-up',
  '/auth', // email-confirmation callback (/auth/confirm) — clicked while signed out
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

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

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
  // Auth.js's own routes are excluded in `config.matcher` below, not here —
  // by the time this line runs the wrapper has already touched the response.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

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
  // `api/auth` is excluded so Auth.js handles its own routes exactly ONCE.
  //
  // `export default auth(...)` above builds a second Auth.js instance. When the
  // matcher let it run on /api/auth/*, both it and the [...nextauth] route
  // handler wrote session cookies onto the same response — a sign-out came back
  // with the session-token Set-Cookie twice. Whichever lands last is the one the
  // browser keeps, so a sign-out could be undone by the middleware re-issuing
  // the session it had just read, and the user stayed signed in.
  //
  // Returning early for /api/ inside the handler does not help: the wrapper has
  // already read the session and attached its cookies before the body runs. The
  // exclusion has to be here, in the matcher.
  //
  // The `(?:/|$)` anchors the exclusion to a whole path segment, so a future
  // /api/authors keeps its middleware instead of being swallowed by the prefix.
  //
  // Must be a plain string literal — Next.js parses this statically at build
  // time and cannot evaluate expressions (template tags, concatenation, etc).
  matcher: ['/((?!api/auth(?:/|$)|_next/static|_next/image|favicon.ico|.+\\.[\\w]+$).*)'],
};
