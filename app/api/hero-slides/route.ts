import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Get top selling products
    const topSellingProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true
          }
        },
        images: {
          where: {
            isPrimary: true
          },
          select: {
            url: true,
            alt: true
          }
        },
        orderItems: {
          select: {
            quantity: true
          }
        }
      },
      take: 20
    })

    // Calculate sales volume for each product
    const productsWithSales = topSellingProducts.map(product => ({
      ...product,
      totalSales: product.orderItems.reduce((sum, item) => sum + item.quantity, 0)
    })).sort((a, b) => b.totalSales - a.totalSales)

    // Get products on sale (with comparePrice)
    const saleProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        comparePrice: {
          not: null
        }
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true
          }
        },
        images: {
          where: {
            isPrimary: true
          },
          select: {
            url: true,
            alt: true
          }
        }
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get featured products
    const featuredProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true
      },
      include: {
        category: true,
        images: {
          where: {
            isPrimary: true
          }
        }
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Create dynamic slides
    const slides = []

    // 1. Top selling product slide
    if (productsWithSales.length > 0) {
      const topProduct = productsWithSales[0]
      const image = topProduct.images[0]?.url || '/images/hero-1.jpg'
      
      slides.push({
        id: 'bestseller',
        type: 'bestseller',
        title: 'Best Seller',
        subtitle: `#1 Most Popular`,
        description: `${topProduct.name} - Loved by ${topProduct.totalSales}+ customers`,
        image: image,
        link: `/products/${topProduct.slug}`,
        cta: 'Shop Best Seller',
        badge: 'BESTSELLER',
        discount: null,
        product: {
          name: topProduct.name,
          price: topProduct.price,
          comparePrice: topProduct.comparePrice,
          category: topProduct.category.name
        }
      })
    }

    // 2. Sale products slide
    if (saleProducts.length > 0) {
      const saleProduct = saleProducts[0]
      const image = saleProduct.images[0]?.url || '/images/hero-2.jpg'
      const discount = saleProduct.comparePrice 
        ? Math.round(((saleProduct.comparePrice - saleProduct.price) / saleProduct.comparePrice) * 100)
        : null

      slides.push({
        id: 'sale',
        type: 'sale',
        title: 'Limited Time Offer',
        subtitle: `Up to ${discount}% Off`,
        description: `Special prices on ${saleProduct.category.name}`,
        image: image,
        link: `/categories/${saleProduct.category.slug}?sale=true`,
        cta: 'Shop Sale',
        badge: 'SALE',
        discount: discount,
        product: {
          name: saleProduct.name,
          price: saleProduct.price,
          comparePrice: saleProduct.comparePrice,
          category: saleProduct.category.name
        }
      })
    }

    // 3. Featured collection slide
    if (featuredProducts.length > 0) {
      const featuredProduct = featuredProducts[0]
      const image = featuredProduct.images[0]?.url || '/images/hero-3.jpg'

      slides.push({
        id: 'featured',
        type: 'featured',
        title: 'New Collection',
        subtitle: 'Featured Products',
        description: `Discover our latest ${featuredProduct.category.name} collection`,
        image: image,
        link: `/categories/${featuredProduct.category.slug}`,
        cta: 'Explore Collection',
        badge: 'NEW',
        discount: null,
        product: {
          name: featuredProduct.name,
          price: featuredProduct.price,
          comparePrice: featuredProduct.comparePrice,
          category: featuredProduct.category.name
        }
      })
    }

    // 4. Category spotlight (if we have multiple categories)
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        products: {
          some: {
            isActive: true
          }
        }
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true
              }
            }
          }
        }
      },
      take: 5,
      orderBy: {
        products: {
          _count: 'desc'
        }
      }
    })

    if (categories.length > 0) {
      const topCategory = categories[0]
      slides.push({
        id: 'category',
        type: 'category',
        title: `${topCategory.name} Collection`,
        subtitle: `${topCategory._count.products} Products`,
        description: `Explore our complete range of ${topCategory.name.toLowerCase()}`,
        image: `/images/category-${topCategory.slug}.jpg`,
        link: `/categories/${topCategory.slug}`,
        cta: 'Browse Collection',
        badge: 'COLLECTION',
        discount: null,
        product: null
      })
    }

    // If no slides generated, return default slides
    if (slides.length === 0) {
      slides.push(
        {
          id: 'default1',
          type: 'default',
          title: 'Exquisite Sarees',
          subtitle: 'Handwoven with Love',
          description: 'Discover our premium collection of sarees',
          image: '/images/hero-1.jpg',
          link: '/products',
          cta: 'Shop Now',
          badge: null,
          discount: null,
          product: null
        },
        {
          id: 'default2',
          type: 'default',
          title: 'Designer Collection',
          subtitle: 'Modern Meets Traditional',
          description: 'Exclusive designer sarees for the contemporary woman',
          image: '/images/hero-2.jpg',
          link: '/products?featured=true',
          cta: 'Explore Collection',
          badge: 'DESIGNER',
          discount: null,
          product: null
        }
      )
    }

    return NextResponse.json({
      slides,
      stats: {
        totalProducts: topSellingProducts.length,
        saleProducts: saleProducts.length,
        featuredProducts: featuredProducts.length,
        categories: categories.length
      }
    })

  } catch (error) {
    console.error('Hero slides API error:', error)
    
    // Return fallback slides on error
    const fallbackSlides = [
      {
        id: 'fallback1',
        type: 'default',
        title: 'Premium Sarees',
        subtitle: 'Handcrafted Excellence',
        description: 'Discover our beautiful collection',
        image: '/images/hero-1.jpg',
        link: '/products',
        cta: 'Shop Now',
        badge: null,
        discount: null,
        product: null
      }
    ]

    return NextResponse.json({ 
      slides: fallbackSlides,
      stats: { totalProducts: 0, saleProducts: 0, featuredProducts: 0, categories: 0 }
    })
  } finally {
    await prisma.$disconnect()
  }
}