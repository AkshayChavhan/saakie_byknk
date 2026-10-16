import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { cached, TAG } from '@/lib/server/cache';

export const runtime = 'nodejs';
export const revalidate = 60;

const loadPromotionalData = cached(
  async () => {
    const promotionalData = await prisma.promotionalBanner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    if (promotionalData.length === 0) {
      return {
        banners: [
          {
            id: '1',
            title: 'Summer Sale',
            description: 'Up to 50% off on selected items',
            image: '/images/promo-1.jpg',
            link: '/products?sale=true',
            backgroundColor: '#FFF5E6',
          },
          {
            id: '2',
            title: 'New Arrivals',
            description: 'Check out our latest collection',
            image: '/images/promo-2.jpg',
            link: '/products?sort=newest',
            backgroundColor: '#E6F5FF',
          },
        ],
        offers: [
          { id: '1', title: 'Free Shipping', description: 'On orders above ₹999', icon: 'truck' },
          { id: '2', title: 'Easy Returns', description: '7 days return policy', icon: 'refresh' },
          { id: '3', title: 'Secure Payment', description: '100% secure checkout', icon: 'shield' },
        ],
      };
    }

    return { banners: promotionalData };
  },
  'promotional-data',
  { tags: [TAG.promos] }
);

export async function GET() {
  try {
    return NextResponse.json(await loadPromotionalData());
  } catch (error) {
    return apiError(error);
  }
}
