import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/server/verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /auth/confirm?token=… — email-confirmation callback (same flow as the
// fast_menu project's /auth/confirm). Credentials auth cannot mint a session
// from a link, so on success we land on /sign-in with a "verified" banner
// rather than straight in the app.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const signInUrl = new URL('/sign-in', request.url);

  if (token) {
    const email = await verifyToken(token);
    if (email) {
      // updateMany rather than update: the account may have been deleted since
      // the email went out, which must not 500 the callback.
      const { count } = await prisma.user.updateMany({
        where: { email },
        data: { emailVerified: new Date() },
      });
      if (count > 0) {
        signInUrl.searchParams.set('verified', '1');
        return NextResponse.redirect(signInUrl);
      }
    }
  }

  // Verification failed or params missing — send to sign-in with a flag.
  signInUrl.searchParams.set('error', 'confirmation_failed');
  return NextResponse.redirect(signInUrl);
}
