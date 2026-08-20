import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
