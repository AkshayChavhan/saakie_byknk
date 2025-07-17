import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/products(.*)',
  '/categories(.*)',
  '/api/products(.*)',
  '/api/categories(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  
  if (!isPublicRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url)
    return NextResponse.redirect(signInUrl)
  }

  if (isAdminRoute(req)) {
    const userRole = (sessionClaims?.publicMetadata as any)?.role as string
    
    if (!userId || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
      const url = new URL('/', req.url)
      return NextResponse.redirect(url)
    }
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