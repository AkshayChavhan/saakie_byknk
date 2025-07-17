import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ role: null }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        role: true,
        email: true,
        name: true
      }
    })

    if (!user) {
      return NextResponse.json({ role: null }, { status: 404 })
    }

    return NextResponse.json({
      role: user.role,
      email: user.email,
      name: user.name
    })
  } catch (error) {
    console.error('Check role API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}