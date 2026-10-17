import 'server-only';
import { watermarkImageUrl } from '@/lib/image-watermark';

/**
 * Apply the logo watermark to the image URLs inside the shapes the API
 * returns, so no response carries a clean product photo. These are the only
 * places image URLs are rewritten; components never see the originals.
 */

type ImageLike = { url: string };

export function markImages<T extends ImageLike>(images: T[]): T[] {
  return images.map((image) => ({ ...image, url: watermarkImageUrl(image.url) }));
}

/** A product (or product summary) carrying `images[]` and/or a flat `image`. */
export function markProduct<T extends { images?: ImageLike[]; image?: string | null }>(product: T): T {
  const next: T = { ...product };
  if (Array.isArray(product.images)) next.images = markImages(product.images) as T['images'];
  if (typeof product.image === 'string') next.image = watermarkImageUrl(product.image) as T['image'];
  return next;
}

/** Cart, wishlist or order lines: `items[].product.images`. */
export function markLines<
  L extends { product?: { images?: ImageLike[] } | null },
  T extends { items?: L[] },
>(holder: T): T {
  if (!Array.isArray(holder.items)) return holder;
  return {
    ...holder,
    items: holder.items.map((line) =>
      line.product ? { ...line, product: markProduct(line.product) } : line
    ),
  };
}
