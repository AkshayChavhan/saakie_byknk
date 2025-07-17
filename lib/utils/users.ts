import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getPublicMetadata(userId: string) {
  try {
    if (!userId) {
      return null
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
      return null
    }

    // Return the user's role and other metadata
    return {
      role: user.role,
      email: user.email,
      name: user.name
    }
  } catch (error) {
    console.error('Error fetching user metadata:', error)
    return null
  } finally {
    await prisma.$disconnect()
  }
}