import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const validStatuses = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
];

const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'];

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: { product: { include: { images: { take: 1 } } } },
        },
        shippingAddress: true,
        billingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;
    const { status, paymentStatus, trackingNumber, notes } = await request.json();

    const updateData: any = {};

    if (status) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
      if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    }

    if (paymentStatus) {
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
      }
      updateData.paymentStatus = paymentStatus;
    }

    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (notes) updateData.notes = notes;

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { name: true, email: true } },
        items: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    return apiError(error);
  }
}
