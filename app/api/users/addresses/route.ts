import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — list the signed-in user's saved shipping addresses (default first).
 */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const addresses = await prisma.address.findMany({
      where: { userId: r.id },
      orderBy: [{ isDefault: 'desc' }],
    });

    return NextResponse.json(addresses);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * POST — create a new address for the signed-in user. The first address a user
 * saves becomes their default. Used by the checkout flow to obtain the
 * `shippingAddressId` that `/api/payments/create-intent` requires.
 */
export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const name = str(body.name);
    const phone = str(body.phone);
    const addressLine1 = str(body.addressLine1);
    const addressLine2 = str(body.addressLine2) || null;
    const city = str(body.city);
    const state = str(body.state);
    const pincode = str(body.pincode);
    const country = str(body.country) || 'India';

    // Required fields per the Address model.
    const missing = Object.entries({ name, phone, addressLine1, city, state, pincode })
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required field(s): ${missing.join(', ')}` },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: 'Pincode must be 6 digits' }, { status: 400 });
    }
    if (!/^\d{10}$/.test(phone.replace(/\D/g, '').slice(-10))) {
      return NextResponse.json({ error: 'Enter a valid 10-digit phone number' }, { status: 400 });
    }

    // First saved address becomes the default.
    const count = await prisma.address.count({ where: { userId: r.id } });

    const address = await prisma.address.create({
      data: {
        userId: r.id,
        name,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country,
        isDefault: count === 0,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
