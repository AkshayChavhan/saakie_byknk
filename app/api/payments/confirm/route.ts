import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const { orderId, paymentId } = await request.json();

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: r.id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentId,
      },
    });

    await prisma.cartItem.deleteMany({
      where: { cart: { userId: r.id } },
    });

    return NextResponse.json({ success: true, message: 'Payment confirmed' });
  } catch (error) {
    return apiError(error);
  }
}
