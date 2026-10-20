import 'server-only';
import prisma from '@/lib/prisma';
import { cached, TAG } from '@/lib/server/cache';
import { getCategoryScopeIds, getSubtreeProductCounts } from '@/lib/server/category-counts';
import { watermarkImageUrl } from '@/lib/image-watermark';
import {
  HERO_SLIDE_DEVICES,
  otherHeroSlideDevice,
  type HeroSlideDevice,
} from '@/lib/hero-slide-device';
import { markProduct } from '@/lib/server/watermark';

/**
 * The storefront's shared reads: everything the home page shows, in the shape
 * the components render. The home page (a server component) calls these
 * directly, so the first HTML already carries the hero, categories, banners
 * and featured products; the public API routes call the same functions for
 * client-side refreshes. All of them are cached under tags that the admin
 * writes invalidate (see lib/server/cache.ts).
 */

// ---------------------------------------------------------------------------
// Hero slides
// ---------------------------------------------------------------------------

export interface HeroSlide {
  id: string;
  type: string;
  title: string;
  /** Null when the admin left the field blank — the component omits it. */
  subtitle: string | null;
  description: string | null;
  image: string;
  /** Button target; null (with `cta`) when the admin left the button blank. */
  link: string | null;
  /** Button label; null when the admin left it blank — no button is shown. */
  cta: string | null;
  /** Which screen set the slide belongs to; null (product-derived) means both. */
  device: HeroSlideDevice | null;
  badge: string | null;
  discount: number | null;
  product: {
    name: string;
    price: number;
    comparePrice: number | null;
    category: string;
  } | null;
}

/**
 * Admin-managed `HeroSlide` rows, or, until an admin has created any, slides
 * derived from real products so the hero is never empty. Raw rows: the API
 * route returns these as-is for compatibility; `toHeroSlides` shapes them for
 * the component.
 *
 * Admin slides are banner artwork, not product photos, and are shown clean:
 * no watermark. The product-derived fallback slides are product photos, so
 * they keep the watermark like every other product image (docs/WATERMARK.md).
 */
export const loadHeroSlides = cached(
  async () => {
    const heroSlides = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    if (heroSlides.length > 0) return heroSlides as RawHeroSlide[];
    return productDerivedSlides().then((slides) => slides.map(markProduct));
  },
  'hero-slides',
  { tags: [TAG.heroSlides, TAG.products] }
);

export interface RawHeroSlide {
  id: string;
  type?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image: string;
  ctaLink?: string | null;
  link?: string | null;
  ctaText?: string | null;
  cta?: string | null;
  device?: HeroSlideDevice | null;
  badge?: string | null;
  discount?: number | null;
  product?: HeroSlide['product'];
  [key: string]: unknown;
}

/** Empty / whitespace-only admin input counts as "not provided". */
const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Shape raw slide rows (admin or product-derived) for `HeroSection`.
 *
 * Optional fields the admin left blank come through as null, not as
 * placeholder copy: the component then omits that element entirely. A button
 * needs a label; a label with no link falls back to the catalogue.
 */
export function toHeroSlides(rows: RawHeroSlide[]): HeroSlide[] {
  return rows.map((slide) => {
    const cta = blankToNull(slide.ctaText) ?? blankToNull(slide.cta);
    const link = blankToNull(slide.ctaLink) ?? blankToNull(slide.link);
    return {
      id: slide.id,
      type: slide.type || 'default',
      title: slide.title,
      subtitle: blankToNull(slide.subtitle),
      description: blankToNull(slide.description),
      image: slide.image,
      link: cta ? link || '/products' : null,
      cta,
      device: slide.device ?? null,
      badge: slide.badge || null,
      discount: slide.discount || null,
      product: slide.product || null,
    };
  });
}

/** The hero's slides per screen class, ready for `HeroSection`. */
export type HeroSlideSets = Record<HeroSlideDevice, HeroSlide[]>;

/**
 * Split shaped slides into the laptop and the phone set. Admin slides go to
 * the set they were uploaded for; product-derived slides carry no device and
 * appear in both. A set the admin has left empty borrows the other one, so a
 * store with only laptop slides still has a hero on phones.
 */
export function heroSlideSets(rows: RawHeroSlide[]): HeroSlideSets {
  const slides = toHeroSlides(rows);
  const sets = Object.fromEntries(
    HERO_SLIDE_DEVICES.map((device) => [
      device,
      slides.filter((slide) => slide.device == null || slide.device === device),
    ])
  ) as HeroSlideSets;
  for (const device of HERO_SLIDE_DEVICES) {
    if (sets[device].length === 0) sets[device] = sets[otherHeroSlideDevice(device)];
  }
  return sets;
}

const productSlideSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  isFeatured: true,
  images: { select: { url: true }, take: 1 },
  category: { select: { name: true } },
  salesCount: true,
} as const;

/** Fallback slides built from real products — featured first, then newest. */
async function productDerivedSlides(): Promise<RawHeroSlide[]> {
  let products = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    select: productSlideSelect,
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: { isActive: true },
      select: productSlideSelect,
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
  }

  return products
    .filter((p) => p.images[0]?.url)
    .map((p, index) => {
      const onSale = p.comparePrice != null && p.comparePrice > p.price;
      const discount = onSale
        ? Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100)
        : null;
      const isBestseller = p.salesCount > 10;

      const type = onSale ? 'sale' : isBestseller ? 'bestseller' : 'featured';
      const badge = onSale
        ? `${discount}% OFF`
        : isBestseller
          ? 'Bestseller'
          : p.isFeatured
            ? 'Featured'
            : null;

      return {
        id: p.id,
        type,
        title: p.name,
        subtitle: p.category?.name ?? 'Saakie_byknk',
        description: onSale
          ? 'Limited-time offer — shop before it’s gone.'
          : 'Handpicked from our latest collection.',
        image: p.images[0].url,
        ctaText: 'Shop Now',
        ctaLink: `/products/${p.slug}`,
        badge,
        discount,
        order: index + 1,
        product: {
          name: p.name,
          price: p.price,
          comparePrice: p.comparePrice,
          category: p.category?.name ?? '',
        },
      };
    });
}

// ---------------------------------------------------------------------------
// Category cards
// ---------------------------------------------------------------------------

export interface CategoryCard {
  id: string;
  name: string;
  slug: string;
  image: string;
  count: number;
}

const coverImageSelect = {
  where: { isActive: true, images: { some: {} } },
  select: {
    images: {
      select: { url: true },
      orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
      take: 1,
    },
  },
  orderBy: { createdAt: 'desc' as const },
  take: 1,
};

/**
 * Top-level category cards with a cover image and a subtree product count.
 * Cached under the categories and products tags, so the per-category image
 * lookups run once per change, not per visit.
 */
export const loadCategoryCards = cached(
  async (): Promise<CategoryCard[]> => {
    // Only top-level categories on the public storefront — sub-categories
    // are surfaced from within their parent's page (/categories/[slug]).
    const [categories, subtreeCounts] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          // Newest pictured product in this category — used as the card's hero
          // shot when no image has been uploaded for the category itself.
          products: coverImageSelect,
          // Most products hang off sub-categories rather than the top-level
          // category, so those are the second place to look for a hero shot.
          children: {
            where: { isActive: true },
            select: { products: coverImageSelect },
          },
        },
        orderBy: { name: 'asc' },
      }),
      getSubtreeProductCounts(),
    ]);

    // Precedence: uploaded category image > a product photo from the category
    // (own products first, then sub-categories) > the generic placeholder.
    const productImage = (category: (typeof categories)[number]) =>
      category.products[0]?.images[0]?.url ??
      category.children
        .flatMap((child) => child.products)
        .map((product) => product.images[0]?.url)
        .find(Boolean);

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: watermarkImageUrl(category.image || productImage(category) || '/images/placeholder-category.svg'),
      // Counts the sub-categories too — a top-level category's own product
      // list is usually empty, which is what made every card read "0 Products".
      count: subtreeCounts.get(category.id) ?? 0,
    }));
  },
  'category-cards',
  { tags: [TAG.categories, TAG.products] }
);

// ---------------------------------------------------------------------------
// Featured products
// ---------------------------------------------------------------------------

export interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  rating: number;
  reviews: number;
  image: string;
  colors: string[];
  category: { name: string; slug: string } | null;
  inStock: boolean;
}

/** Fields a product card needs; shared by the featured and new-arrival shelves. */
const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  stock: true,
  images: { select: { url: true }, take: 1 },
  colors: { select: { hexCode: true } },
  category: { select: { name: true, slug: true } },
  rating: true,
  _count: { select: { reviews: { where: { status: 'APPROVED' as const } } } },
} as const;

type ProductCardRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  images: { url: string }[];
  colors: { hexCode: string }[];
  category: { name: string; slug: string } | null;
  rating: number;
  _count: { reviews: number };
};

function toProductCard(product: ProductCardRow): FeaturedProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    // Pass through as-is. `null` means "not on sale" and the UI must not
    // render a discount badge — never substitute a derived reference price.
    comparePrice: product.comparePrice,
    // Maintained on the product by review moderation (lib/server/reviews.ts).
    rating: Math.round(product.rating * 10) / 10,
    reviews: product._count.reviews,
    image: watermarkImageUrl(product.images[0]?.url || '/images/placeholder-product.svg'),
    colors: Array.from(new Set(product.colors.map((c) => c.hexCode))),
    category: product.category,
    inStock: product.stock > 0,
  };
}

export const loadFeaturedProducts = cached(
  async (): Promise<FeaturedProduct[]> => {
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      select: productCardSelect,
      take: 8,
      orderBy: { createdAt: 'desc' },
    });
    return products.map(toProductCard);
  },
  'featured-products',
  { tags: [TAG.products] }
);

// ---------------------------------------------------------------------------
// New arrivals
// ---------------------------------------------------------------------------

/** A product counts as a new arrival for this many days after it is created. */
export const NEW_ARRIVAL_WINDOW_DAYS = 14;

/** Products created at or after this instant are new arrivals. */
export function newArrivalCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Active products added in the last two weeks, newest first. Empty when
 * nothing qualifies, and the home page then omits the section entirely.
 *
 * The window is relative to "now", so the tagged cache alone would let a
 * product linger past day 14; the default 5-minute revalidate in `cached()`
 * re-evaluates the cutoff often enough that the drift is never visible.
 */
export const loadNewArrivals = cached(
  async (): Promise<FeaturedProduct[]> => {
    const products = await prisma.product.findMany({
      where: { isActive: true, createdAt: { gte: newArrivalCutoff() } },
      select: productCardSelect,
      take: 8,
      orderBy: { createdAt: 'desc' },
    });
    return products.map(toProductCard);
  },
  'new-arrivals',
  { tags: [TAG.products] }
);

// ---------------------------------------------------------------------------
// Category shelves
// ---------------------------------------------------------------------------

export interface CategoryShelfData {
  id: string;
  name: string;
  slug: string;
  products: FeaturedProduct[];
}

/** Products shown per category shelf on the home page. */
export const CATEGORY_SHELF_SIZE = 8;

/**
 * One shelf per active top-level category, in name order, each holding that
 * category's newest active products (its sub-categories included, since most
 * stock hangs off them). Categories with nothing to show are left out, so
 * the home page never renders an empty heading.
 */
export const loadCategoryShelves = cached(
  async (): Promise<CategoryShelfData[]> => {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    const shelves = await Promise.all(
      categories.map(async (category) => {
        const products = await prisma.product.findMany({
          where: { isActive: true, categoryId: { in: await getCategoryScopeIds(category.id) } },
          select: productCardSelect,
          take: CATEGORY_SHELF_SIZE,
          orderBy: { createdAt: 'desc' },
        });
        return { ...category, products: products.map(toProductCard) };
      })
    );

    return shelves.filter((shelf) => shelf.products.length > 0);
  },
  'category-shelves',
  { tags: [TAG.categories, TAG.products] }
);

// ---------------------------------------------------------------------------
// Promotional banners and highlight cards
// ---------------------------------------------------------------------------

/** Admin banners for `GET /api/promotional-data`, with defaults until any exist. */
export const loadPromotionalData = cached(
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

export interface PromotionalStats {
  bestSellers: {
    count: number;
    products: Array<{ name: string; slug: string; price: number; totalSales: number }>;
  };
  saleProducts: {
    count: number;
    maxDiscount: number;
    products: Array<{ name: string; slug: string; price: number; comparePrice: number; discount: number }>;
  };
  featuredProducts: {
    count: number;
    products: Array<{ name: string; slug: string; category: string }>;
  };
}

/**
 * The three highlight cards under the hero (best sellers, sale, featured).
 * `PromotionalBanner` always expected this shape but was wired to the
 * banners endpoint, so it rendered nothing; the home page now feeds it from
 * here. Cards with a zero count stay hidden.
 */
export const loadPromotionalStats = cached(
  async (): Promise<PromotionalStats> => {
    const onSale = { isActive: true, comparePrice: { gt: prisma.product.fields.price } };
    const [bestSellerCount, topSeller, saleCount, saleSample, featuredCount, latestFeatured] =
      await Promise.all([
        prisma.product.count({ where: { isActive: true, salesCount: { gt: 0 } } }),
        prisma.product.findFirst({
          where: { isActive: true, salesCount: { gt: 0 } },
          orderBy: { salesCount: 'desc' },
          select: { name: true, slug: true, price: true, salesCount: true },
        }),
        prisma.product.count({ where: onSale }),
        prisma.product.findMany({
          where: onSale,
          select: { name: true, slug: true, price: true, comparePrice: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.product.count({ where: { isActive: true, isFeatured: true } }),
        prisma.product.findFirst({
          where: { isActive: true, isFeatured: true },
          orderBy: { createdAt: 'desc' },
          select: { name: true, slug: true, category: { select: { name: true } } },
        }),
      ]);

    const sale = saleSample
      .map((p) => ({
        name: p.name,
        slug: p.slug,
        price: p.price,
        comparePrice: p.comparePrice as number,
        discount: Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100),
      }))
      .sort((a, b) => b.discount - a.discount);

    return {
      bestSellers: {
        count: bestSellerCount,
        products: topSeller
          ? [{ name: topSeller.name, slug: topSeller.slug, price: topSeller.price, totalSales: topSeller.salesCount }]
          : [],
      },
      saleProducts: {
        count: saleCount,
        maxDiscount: sale[0]?.discount ?? 0,
        products: sale.slice(0, 1),
      },
      featuredProducts: {
        count: featuredCount,
        products: latestFeatured
          ? [{ name: latestFeatured.name, slug: latestFeatured.slug, category: latestFeatured.category?.name ?? '' }]
          : [],
      },
    };
  },
  'promotional-stats',
  { tags: [TAG.products] }
);
