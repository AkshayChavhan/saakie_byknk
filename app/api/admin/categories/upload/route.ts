import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { uploadToCloudinary, type CloudinaryUploadResult } from '@/lib/cloudinary'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting category upload API request...')
    
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

    // Parse form data
    console.log('📝 Parsing form data...')
    const formData = await request.formData()
    console.log('🔑 Form data keys:', Array.from(formData.keys()))
    
    const dataString = formData.get('data') as string
    if (!dataString) {
      return NextResponse.json({ error: 'No category data provided' }, { status: 400 })
    }
    
    console.log('📊 Data string length:', dataString.length)
    const categoryData = JSON.parse(dataString)
    console.log('✅ Category data parsed:', categoryData.name)
    
    // Get image file
    const imageFile = formData.get('image') as File
    console.log('🖼️ Image file:', imageFile?.name, imageFile?.size, imageFile?.type)
    
    let uploadedImage: CloudinaryUploadResult | null = null
    
    if (imageFile && imageFile.size > 0) {
      // Upload to Cloudinary in categories folder
      console.log('☁️ Uploading to Cloudinary categories folder...')
      uploadedImage = await uploadToCloudinary(imageFile, 'categories')
      console.log('✅ Upload successful:', uploadedImage)
    }

    // Create category with image
    console.log('📝 Creating category with data:', {
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description || null,
      parentId: categoryData.parentId || null,
      isActive: categoryData.isActive === 'true' || categoryData.isActive === true,
      hasImage: !!uploadedImage
    })

    const categoryCreateData: any = {
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description || null,
      parentId: categoryData.parentId && categoryData.parentId !== '' ? categoryData.parentId : null,
      isActive: categoryData.isActive === 'true' || categoryData.isActive === true
    }

    // Add image data if uploaded
    if (uploadedImage) {
      categoryCreateData.image = uploadedImage.url
      categoryCreateData.imagePublicId = uploadedImage.publicId
      categoryCreateData.imageWidth = uploadedImage.width
      categoryCreateData.imageHeight = uploadedImage.height
      categoryCreateData.imageFormat = uploadedImage.format
    }

    const category = await prisma.category.create({
      data: categoryCreateData,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    console.log('✅ Category created successfully:', category.id)
    return NextResponse.json(category)
    
  } catch (error) {
    console.error('❌ Category upload API error:', error)
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}