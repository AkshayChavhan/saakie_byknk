import { uploadToCloudinary } from './cloudinary';

export interface UploadedImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}

export const uploadProductImages = async (files: File[]): Promise<UploadedImage[]> => {
  const uploadPromises = files.map(file => uploadToCloudinary(file, 'products'));
  const results = await Promise.all(uploadPromises);
  return results as UploadedImage[];
};

export const uploadSingleImage = async (file: File, folder: string = 'products'): Promise<UploadedImage> => {
  const result = await uploadToCloudinary(file, folder);
  return result as UploadedImage;
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size exceeds 5MB limit.' };
  }

  return { valid: true };
};

export const processFormDataImages = async (formData: FormData, fieldName: string = 'images'): Promise<File[]> => {
  const files: File[] = [];
  const entries = formData.getAll(fieldName);
  
  for (const entry of entries) {
    if (entry instanceof File) {
      const validation = validateImageFile(entry);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      files.push(entry);
    }
  }
  
  return files;
};