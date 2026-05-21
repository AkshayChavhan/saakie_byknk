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
  '/careers',
  '/contact',
  '/faq',
  '/post',
  '/care-instructions',
  '/size-guide',
  '/shipping-returns',
  '/sign-in',
  '/sign-up',
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
  matcher: [
    // Run on everything except Next internals and files with an extension.
    String.raw`/((?!_next/static|_next/image|favicon.ico|.+\.[\w]+$).*)`,
  ],
};
