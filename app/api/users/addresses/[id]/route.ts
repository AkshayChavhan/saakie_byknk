import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { isValidPhone, splitPhone, formatPhone } from '@/lib/phone';
import { districtsFor } from '@/lib/india-districts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT — update every field of an existing address. Same validation as the
 * create route: all fields required, 6-digit pincode, country-aware phone
 * check, and the phone stored canonically as "+<dial> <digits>".
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const { id } = await context.params;

    // Scoped by userId — another customer's address is indistinguishable from
    // one that does not exist.
    const address = await prisma.address.findFirst({
      where: { id, userId: r.id },
      select: { id: true },
    });
    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const name = str(body.name);
    const phone = str(body.phone);
    const addressLine1 = str(body.addressLine1);
    const addressLine2 = str(body.addressLine2);
    const city = str(body.city);
    const district = str(body.district);
    const state = str(body.state);
    const pincode = str(body.pincode);

    const missing = Object.entries({ name, phone, addressLine1, addressLine2, city, district, state, pincode })
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required field(s): ${missing.join(', ')}` },
        { status: 400 }
      );
    }
    if (!districtsFor(state).includes(district)) {
      return NextResponse.json(
        { error: 'Choose a district that belongs to the selected state' },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: 'Pincode must be 6 digits' }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
    }
    const parsedPhone = splitPhone(phone);
    const canonicalPhone = formatPhone(parsedPhone.country, parsedPhone.national);

    await prisma.address.update({
      where: { id: address.id },
      data: { name, phone: canonicalPhone, addressLine1, addressLine2, city, district, state, pincode },
    });

    // The full list back, default first — the caller renders straight from it.
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
 * PATCH — make this address the user's default delivery address.
 *
 * "Default" is a property of the set, not of one row: exactly one of a user's
 * addresses may carry it. Promoting one therefore has to demote the rest, and
 * both writes happen in a transaction so a failure between them cannot leave
 * the user with two defaults (the storefront would pick one arbitrarily) or,
 * worse, with the old one demoted and the new one never promoted.
 *
 * This is what the cart's "Change" control calls, so the address shown there,
 * the one pre-selected at checkout, and the one stored on the next order stay
 * the same address.
 */
export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const { id } = await context.params;

    // Scoped by userId, so another customer's address is indistinguishable
    // from one that does not exist — and cannot be promoted onto this account.
    const address = await prisma.address.findFirst({
      where: { id, userId: r.id },
      select: { id: true, isDefault: true },
    });

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    if (!address.isDefault) {
      await prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { userId: r.id, isDefault: true },
          data: { isDefault: false },
        });
        await tx.address.update({
          where: { id: address.id },
          data: { isDefault: true },
        });
      });
    }

    // The full list back, default first — the caller renders straight from it
    // rather than guessing at the new order.
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
 * DELETE — remove this address from the user's address book.
 *
 * Past orders keep a required reference to their shipping address, so a row
 * any order points at is detached from the account (userId cleared) rather
 * than deleted — the order history keeps rendering, while the customer never
 * sees the address again. Rows no order references are deleted outright.
 * If the removed address was the default, the first remaining one is promoted
 * so the "exactly one default" invariant survives.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const { id } = await context.params;

    const address = await prisma.address.findFirst({
      where: { id, userId: r.id },
      select: { id: true, isDefault: true },
    });

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const orderCount = await prisma.order.count({
      where: { OR: [{ shippingAddressId: id }, { billingAddressId: id }] },
    });

    await prisma.$transaction(async (tx) => {
      if (orderCount > 0) {
        await tx.address.update({
          where: { id },
          data: { userId: null, isDefault: false },
        });
      } else {
        await tx.address.delete({ where: { id } });
      }
      if (address.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: r.id } });
        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    const addresses = await prisma.address.findMany({
      where: { userId: r.id },
      orderBy: [{ isDefault: 'desc' }],
    });

    return NextResponse.json(addresses);
  } catch (error) {
    return apiError(error);
  }
}
