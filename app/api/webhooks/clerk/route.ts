import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
    }

    const rawBody = await request.text();

    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
    }

    const eventType = evt.type;
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    console.log(`Clerk webhook received: ${eventType}`);

    switch (eventType) {
      case 'user.created': {
        const email = email_addresses?.[0]?.email_address;
        if (!email) {
          console.error('No email found in user.created event');
          return NextResponse.json({ error: 'No email found' }, { status: 400 });
        }

        const name = [first_name, last_name].filter(Boolean).join(' ') || null;

        const user = await prisma.user.create({
          data: {
            clerkId: id,
            email,
            name,
            imageUrl: image_url || null,
            role: 'USER',
          },
        });

        await Promise.all([
          prisma.cart.create({ data: { userId: user.id } }),
          prisma.wishlist.create({ data: { userId: user.id } }),
        ]);

        console.log(`User created: ${email}`);
        break;
      }

      case 'user.updated': {
        const email = email_addresses?.[0]?.email_address;
        const name = [first_name, last_name].filter(Boolean).join(' ') || null;

        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: email || undefined,
            name,
            imageUrl: image_url || null,
          },
        });

        console.log(`User updated: ${id}`);
        break;
      }

      case 'user.deleted': {
        const user = await prisma.user.findUnique({ where: { clerkId: id } });

        if (user) {
          await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
          await prisma.cart.deleteMany({ where: { userId: user.id } });
          await prisma.wishlistItem.deleteMany({
            where: { wishlist: { userId: user.id } },
          });
          await prisma.wishlist.deleteMany({ where: { userId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });

          console.log(`User deleted: ${id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
