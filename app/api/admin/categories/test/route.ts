import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log('🔍 Testing categories API...')
    
    const { userId } = await auth()
    console.log('👤 User ID:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and check if admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })
    console.log('🔐 User role:', user?.role)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Test basic category query
    console.log('📊 Testing category count...')
    const categoryCount = await prisma.category.count()
    console.log('✅ Category count:', categoryCount)

    // Test simple category query
    console.log('📋 Testing category listing...')
    const categories = await prisma.category.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        imagePublicId: true
      }
    })
    console.log('✅ Sample categories:', categories)

    return NextResponse.json({
      success: true,
      categoryCount,
      sampleCategories: categories,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Categories test API error:', error)
    
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}