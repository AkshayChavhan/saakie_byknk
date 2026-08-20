import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const formData = await request.formData();
    const dataJson = formData.get('data');
    const files = formData.getAll('images').filter((f): f is File => f instanceof File);

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Too many files. Maximum is 10 files.' },
        { status: 400 }
      );
    }

    for (const file of files) {
      const v = validateImageFile(file);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
    }

    const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : {};
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
      isActive = true,
      isFeatured = false,
    } = data;

    if (!name || !slug || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Name, slug, price, and categoryId are required' },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400 }
      );
    }

    const uploadedImages: Array<{
      url: string;
      publicId: string;
      width?: number;
      height?: number;
      format?: string;
      isPrimary: boolean;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadImage(buffer, 'products');
        uploadedImages.push({
          url: result.url,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          format: result.format,
          isPrimary: i === 0,
        });
      } catch (uploadError) {
        console.error(`Error uploading file ${i + 1} to Cloudinary:`, uploadError);
      }
    }

    const dimensions =
      length && width && height
        ? {
            create: {
              length: parseFloat(length),
              width: parseFloat(width),
              height: parseFloat(height),
            },
          }
        : undefined;

    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : colors;
    const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    let parsedOccasion: string[] = [];
    if (typeof occasion === 'string') {
      try {
        parsedOccasion = JSON.parse(occasion);
      } catch {
        parsedOccasion = occasion.trim() ? [occasion.trim()] : [];
      }
    } else if (Array.isArray(occasion)) {
      parsedOccasion = occasion;
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || '',
        shortDescription,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stock: stock ? parseInt(stock) : 0,
        lowStockAlert: lowStockAlert ? parseInt(lowStockAlert) : 10,
        categoryId,
        brand,
        material,
        pattern,
        occasion: parsedOccasion,
        careInstructions,
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        blouseIncluded: blouseIncluded === true || blouseIncluded === 'true',
        isActive: isActive === true || isActive === 'true',
        isFeatured: isFeatured === true || isFeatured === 'true',
        images:
          uploadedImages.length > 0
            ? {
                create: uploadedImages.map((img, index) => ({
                  url: img.url,
                  publicId: img.publicId,
                  width: img.width,
                  height: img.height,
                  format: img.format,
                  isPrimary: img.isPrimary,
                  order: index,
                })),
              }
            : undefined,
        colors:
          parsedColors && parsedColors.length > 0
            ? {
                create: parsedColors.map((color: { name: string; hexCode: string }) => ({
                  name: color.name,
                  hexCode: color.hexCode,
                })),
              }
            : undefined,
        sizes:
          parsedSizes && parsedSizes.length > 0
            ? {
                create: parsedSizes.map((size: { name: string }) => ({ name: size.name })),
              }
            : undefined,
      },
      include: {
        category: true,
        images: true,
        colors: true,
        sizes: true,
        dimensions: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
