import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Get best selling products
    const bestSellingProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        orderItems: {
          select: {
            quantity: true
          }
        }
      },
      take: 20
    })

    // Calculate sales and sort
    const productsWithSales = bestSellingProducts
      .map(product => ({
        name: product.name,
        slug: product.slug,
        price: product.price,
        totalSales: product.orderItems.reduce((sum, item) => sum + item.quantity, 0)
      }))
      .filter(product => product.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)

    // Get sale products
    const saleProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        comparePrice: {
          not: null
        }
      },
      select: {
        name: true,
        slug: true,
        price: true,
        comparePrice: true
      },
      take: 10
    })

    // Calculate discounts
    const saleProductsWithDiscount = saleProducts
      .map(product => ({
        ...product,
        discount: product.comparePrice 
          ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
          : 0
      }))
      .sort((a, b) => b.discount - a.discount)

    // Get featured products
    const featuredProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true
      },
      select: {
        name: true,
        slug: true,
        category: {
          select: {
            name: true
          }
        }
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      bestSellers: {
        count: productsWithSales.length,
        products: productsWithSales.slice(0, 3)
      },
      saleProducts: {
        count: saleProductsWithDiscount.length,
        maxDiscount: saleProductsWithDiscount.length > 0 ? saleProductsWithDiscount[0].discount : 0,
        products: saleProductsWithDiscount.slice(0, 3)
      },
      featuredProducts: {
        count: featuredProducts.length,
        products: featuredProducts.map(p => ({
          name: p.name,
          slug: p.slug,
          category: p.category.name
        })).slice(0, 3)
      }
    })

  } catch (error) {
    console.error('Promotional data API error:', error)
    return NextResponse.json({
      bestSellers: { count: 0, products: [] },
      saleProducts: { count: 0, maxDiscount: 0, products: [] },
      featuredProducts: { count: 0, products: [] }
    })
  } finally {
    await prisma.$disconnect()
  }
}