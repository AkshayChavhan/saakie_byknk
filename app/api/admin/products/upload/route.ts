import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { uploadToCloudinary, type CloudinaryUploadResult } from '@/lib/cloudinary'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting upload API request...')
    
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
      return NextResponse.json({ error: 'No product data provided' }, { status: 400 })
    }
    
    console.log('📊 Data string length:', dataString.length)
    const productData = JSON.parse(dataString)
    console.log('✅ Product data parsed:', productData.name)
    
    // Get images
    const imageFiles = formData.getAll('images') as File[]
    console.log('🖼️ Image files count:', imageFiles.length)
    
    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
    }

    // Validate and upload first image only for testing
    const firstImage = imageFiles[0]
    console.log('📷 First image:', firstImage.name, firstImage.size, firstImage.type)
    
    // Upload to Cloudinary
    console.log('☁️ Uploading to Cloudinary...')
    const uploadedImage: CloudinaryUploadResult = await uploadToCloudinary(firstImage, 'products')
    console.log('✅ Upload successful:', uploadedImage)

    // Create simple product
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        price: parseFloat(productData.price),
        comparePrice: productData.compareAtPrice ? parseFloat(productData.compareAtPrice) : null,
        stock: parseInt(productData.stock),
        lowStockAlert: productData.lowStockAlert ? parseInt(productData.lowStockAlert) : 10,
        categoryId: productData.categoryId,
        material: productData.material || null,
        pattern: productData.pattern || null,
        occasion: productData.occasion ? [productData.occasion] : [],
        careInstructions: productData.careInstructions || null,
        weight: productData.weight ? parseFloat(productData.weight) : null,
        blouseIncluded: productData.blouseIncluded === 'true' || productData.blouseIncluded === true,
        isActive: productData.isActive === 'true' || productData.isActive === true,
        isFeatured: productData.isFeatured === 'true' || productData.isFeatured === true,
        images: {
          create: {
            url: uploadedImage.url,
            publicId: uploadedImage.publicId,
            width: uploadedImage.width,
            height: uploadedImage.height,
            format: uploadedImage.format,
            isPrimary: true,
            alt: `${productData.name} - Image 1`
          }
        }
      },
      include: {
        category: {
          select: {
            name: true
          }
        },
        images: {
          select: {
            url: true,
            publicId: true,
            isPrimary: true
          }
        }
      }
    })

    console.log('✅ Product created successfully:', product.id)
    return NextResponse.json(product)
    
  } catch (error) {
    console.error('❌ Upload API error:', error)
    
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