import { NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await optionalAuth();

    if (!user) {
      return NextResponse.json({
        isAuthenticated: false,
        role: null,
        isAdmin: false,
        isSuperAdmin: false,
      });
    }

    return NextResponse.json({
      isAuthenticated: true,
      role: user.role,
      isAdmin: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
      isSuperAdmin: user.role === 'SUPER_ADMIN',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
