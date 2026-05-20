import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  try {
    const heroSlides = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    if (heroSlides.length === 0) {
      return NextResponse.json([
        {
          id: '1',
          title: 'Exquisite Silk Sarees',
          subtitle: 'Handcrafted with Love',
          description: 'Discover our collection of premium silk sarees',
          image: '/images/hero-1.jpg',
          ctaText: 'Shop Now',
          ctaLink: '/products?category=silk',
          order: 1,
        },
        {
          id: '2',
          title: 'Wedding Collection',
          subtitle: 'For Your Special Day',
          description: 'Elegant bridal sarees for your memorable moments',
          image: '/images/hero-2.jpg',
          ctaText: 'Explore',
          ctaLink: '/products?category=wedding',
          order: 2,
        },
      ]);
    }

    return NextResponse.json(heroSlides);
  } catch (error) {
    return apiError(error);
  }
}
