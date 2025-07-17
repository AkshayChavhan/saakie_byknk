import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  const payload = await req.text()
  const body = JSON.parse(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  const { id } = evt.data
  const eventType = evt.type

  console.log(`Webhook with an ID of ${id} and type of ${eventType}`)
  console.log('Webhook body:', body)

  try {
    if (eventType === 'user.created') {
      const { id: clerkId, email_addresses, first_name, last_name, phone_numbers } = evt.data

      const primaryEmail = email_addresses?.[0]?.email_address
      const primaryPhone = phone_numbers?.[0]?.phone_number
      const name = first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || null

      if (!primaryEmail) {
        console.error('No email found for user')
        return new Response('No email found for user', { status: 400 })
      }

      const user = await prisma.user.create({
        data: {
          clerkId,
          email: primaryEmail,
          name,
          phone: primaryPhone || null,
          role: 'USER',
        },
      })

      console.log('User created in database:', user)

      // Create empty cart and wishlist for the new user
      await Promise.all([
        prisma.cart.create({
          data: {
            userId: user.id,
          },
        }),
        prisma.wishlist.create({
          data: {
            userId: user.id,
          },
        }),
      ])

      console.log('Cart and wishlist created for user:', user.id)
    }

    if (eventType === 'user.updated') {
      const { id: clerkId, email_addresses, first_name, last_name, phone_numbers } = evt.data

      const primaryEmail = email_addresses?.[0]?.email_address
      const primaryPhone = phone_numbers?.[0]?.phone_number
      const name = first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || null

      if (!primaryEmail) {
        console.error('No email found for user update')
        return new Response('No email found for user', { status: 400 })
      }

      const user = await prisma.user.update({
        where: { clerkId },
        data: {
          email: primaryEmail,
          name,
          phone: primaryPhone || null,
        },
      })

      console.log('User updated in database:', user)
    }

    if (eventType === 'user.deleted') {
      const { id: clerkId } = evt.data

      await prisma.user.delete({
        where: { clerkId },
      })

      console.log('User deleted from database:', clerkId)
    }

    return new Response('', { status: 200 })
  } catch (error) {
    console.error('Database error:', error)
    return new Response('Database error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}