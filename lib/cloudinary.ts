import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (file: File, folder: string = 'products') => {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `saakie-byknk/${folder}`,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
          transformation: [
            { quality: 'auto:best' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result?.secure_url,
              publicId: result?.public_id,
              width: result?.width,
              height: result?.height,
              format: result?.format,
            });
          }
        }
      ).end(buffer);
    });
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export const deleteFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

export const generateOptimizedUrl = (publicId: string, options: {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string | number;
} = {}) => {
  return cloudinary.url(publicId, {
    transformation: [
      {
        width: options.width,
        height: options.height,
        crop: options.crop || 'fill',
        quality: options.quality || 'auto',
        fetch_format: 'auto',
      },
    ],
    secure: true,
  });
};

export default cloudinary;