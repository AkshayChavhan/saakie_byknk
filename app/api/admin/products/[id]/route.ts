import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        colors: true,
        sizes: true,
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Update a product.
 *
 * Accepts two body shapes:
 *  - JSON — lightweight scalar updates (e.g. the isActive / isFeatured toggles).
 *  - multipart/form-data — full edit, including image management:
 *      `data`            JSON of scalar fields (+ `colors`, `sizes`, `length/width/height`)
 *      `newImages`       File[] to upload to Cloudinary
 *      `removedImageIds` JSON string[] of Image ids to delete
 *      `primaryImageId`  id of the image to mark primary (existing or, for a
 *                        newly-added image, the literal `new:<index>`)
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    // --- JSON path: simple scalar updates (toggles) ---
    if (!contentType.includes('multipart/form-data')) {
      const updateData = await request.json();
      const { images: _i, colors: _c, sizes: _s, ...productData } = updateData;

      const product = await prisma.product.update({
        where: { id },
        data: productData,
        include: { category: true, images: true, colors: true, sizes: true },
      });
      return NextResponse.json(product);
    }

    // --- FormData path: full edit with images ---
    const formData = await request.formData();
    const dataJson = formData.get('data');
    const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : {};
    const newFiles = formData
      .getAll('newImages')
      .filter((f): f is File => f instanceof File);
    const removedImageIds: string[] = (() => {
      const raw = formData.get('removedImageIds');
      return typeof raw === 'string' ? JSON.parse(raw) : [];
    })();
    const primaryImageId =
      typeof formData.get('primaryImageId') === 'string'
        ? (formData.get('primaryImageId') as string)
        : null;

    const {
      name,
      slug,
      description,
      shortDescription,
      price,
      comparePrice,
      costPrice,
      stock,
      lowStockAlert,
      categoryId,
      brand,
      material,
      pattern,
      occasion,
      careInstructions,
      weight,
      length,
      width,
      height,
      blouseIncluded,
      colors,
      sizes,
      isActive,
      isFeatured,
    } = data;

    // Slug uniqueness — must exclude the current product.
    if (slug && slug !== existing.slug) {
      const slugClash = await prisma.product.findUnique({ where: { slug } });
      if (slugClash) {
        return NextResponse.json(
          { error: 'Another product already uses this slug' },
          { status: 400 }
        );
      }
    }

    // Validate new image files before any DB/Cloudinary writes.
    if (newFiles.length > 10) {
      return NextResponse.json(
        { error: 'Too many files. Maximum is 10 files.' },
        { status: 400 }
      );
    }
    for (const file of newFiles) {
      const v = validateImageFile(file);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
    }

    // Don't allow removing every image and adding none.
    const remainingExisting = existing.images.filter(
      (img) => !removedImageIds.includes(img.id)
    );
    if (remainingExisting.length === 0 && newFiles.length === 0) {
      return NextResponse.json(
        { error: 'A product must have at least one image' },
        { status: 400 }
      );
    }

    // Upload new images to Cloudinary.
    const uploaded: Array<{
      url: string;
      publicId: string;
      width?: number;
      height?: number;
      format?: string;
    }> = [];
    for (const file of newFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      uploaded.push(await uploadImage(buffer, 'products'));
    }

    const parsedOccasion: string[] = Array.isArray(occasion)
      ? occasion
      : typeof occasion === 'string' && occasion.trim()
        ? [occasion.trim()]
        : [];
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
    const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;

    // Apply everything in a transaction.
    await prisma.$transaction(async (tx) => {
      // Scalar fields.
      await tx.product.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(slug !== undefined && { slug }),
          ...(description !== undefined && { description: description || '' }),
          ...(shortDescription !== undefined && { shortDescription }),
          ...(price !== undefined && { price: parseFloat(price) }),
          comparePrice: comparePrice ? parseFloat(comparePrice) : null,
          costPrice: costPrice ? parseFloat(costPrice) : null,
          ...(stock !== undefined && { stock: parseInt(stock) || 0 }),
          ...(lowStockAlert !== undefined && {
            lowStockAlert: parseInt(lowStockAlert) || 10,
          }),
          ...(categoryId !== undefined && { categoryId }),
          ...(brand !== undefined && { brand }),
          ...(material !== undefined && { material }),
          ...(pattern !== undefined && { pattern }),
          ...(occasion !== undefined && { occasion: parsedOccasion }),
          ...(careInstructions !== undefined && { careInstructions }),
          weight: weight ? parseFloat(weight) : null,
          ...(blouseIncluded !== undefined && {
            blouseIncluded: blouseIncluded === true || blouseIncluded === 'true',
          }),
          ...(isActive !== undefined && {
            isActive: isActive === true || isActive === 'true',
          }),
          ...(isFeatured !== undefined && {
            isFeatured: isFeatured === true || isFeatured === 'true',
          }),
        },
      });

      // Remove images (Cloudinary + DB).
      for (const img of existing.images) {
        if (removedImageIds.includes(img.id)) {
          if (img.publicId) {
            await deleteFromCloudinary(img.publicId).catch(() => {});
          }
          await tx.image.delete({ where: { id: img.id } });
        }
      }

      // Add new images.
      const createdNew = [];
      for (let i = 0; i < uploaded.length; i++) {
        const img = uploaded[i];
        const created = await tx.image.create({
          data: {
            url: img.url,
            publicId: img.publicId,
            width: img.width,
            height: img.height,
            format: img.format,
            isPrimary: false,
            productId: id,
          },
        });
        createdNew.push(created);
      }

      // Resolve primary image. `primaryImageId` may reference an existing image
      // id or `new:<index>` for a freshly-uploaded one.
      let primaryId: string | null = null;
      if (primaryImageId?.startsWith('new:')) {
        const idx = parseInt(primaryImageId.slice(4));
        primaryId = createdNew[idx]?.id ?? null;
      } else if (
        primaryImageId &&
        !removedImageIds.includes(primaryImageId)
      ) {
        primaryId = primaryImageId;
      }
      // Fall back to the first remaining/added image.
      if (!primaryId) {
        primaryId =
          remainingExisting[0]?.id ?? createdNew[0]?.id ?? null;
      }
      if (primaryId) {
        await tx.image.updateMany({
          where: { productId: id },
          data: { isPrimary: false },
        });
        await tx.image.update({
          where: { id: primaryId },
          data: { isPrimary: true },
        });
      }

      // Replace colors / sizes (delete-all-then-recreate).
      if (parsedColors !== undefined) {
        await tx.color.deleteMany({ where: { productId: id } });
        if (Array.isArray(parsedColors) && parsedColors.length > 0) {
          await tx.color.createMany({
            data: parsedColors.map((c: { name: string; hexCode: string }) => ({
              name: c.name,
              hexCode: c.hexCode,
              productId: id,
            })),
          });
        }
      }
      if (parsedSizes !== undefined) {
        await tx.size.deleteMany({ where: { productId: id } });
        if (Array.isArray(parsedSizes) && parsedSizes.length > 0) {
          await tx.size.createMany({
            data: parsedSizes.map((s: { name: string }) => ({
              name: s.name,
              productId: id,
            })),
          });
        }
      }
    });

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: true, colors: true, sizes: true },
    });

    return NextResponse.json(product);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const orderCount = await prisma.orderItem.count({ where: { productId: id } });

    if (orderCount > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ message: 'Product deactivated (has orders)' });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return apiError(error);
  }
}
