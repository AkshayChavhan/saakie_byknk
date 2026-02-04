// API Configuration for Backend - v2
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MASTER_API_KEY = process.env.NEXT_PUBLIC_MASTER_API_KEY || '';

interface ApiOptions extends RequestInit {
  token?: string;
}

/**
 * Helper to get the full API URL
 */
export function getApiUrl(endpoint: string): string {
  // If the endpoint starts with /api, use the backend URL
  if (endpoint.startsWith('/api')) {
    return `${API_BASE_URL}${endpoint}`;
  }
  return endpoint;
}

/**
 * Simple fetch wrapper that automatically uses the backend URL
 * Use this for quick migrations from direct fetch calls
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(endpoint);

  // Add master API key header if available
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (MASTER_API_KEY) {
    headers['X-API-Key'] = MASTER_API_KEY;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Base fetch wrapper for API calls to the Express backend
 */
async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add master API key for backend authentication
  if (MASTER_API_KEY) {
    headers['X-API-Key'] = MASTER_API_KEY;
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.error?.message || error.message || 'API request failed');
  }

  return response.json();
}

// ============================================
// Product APIs
// ============================================
export interface ProductListParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price-low' | 'price-high' | 'popular';
  inStock?: boolean;
  page?: number;
  limit?: number;
}

export const productApi = {
  list: (params?: ProductListParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return apiFetch<any>(`/api/products${query ? `?${query}` : ''}`);
  },

  getBySlug: (slug: string) =>
    apiFetch<any>(`/api/products/${slug}`),

  getFeatured: () =>
    apiFetch<any>('/api/products/featured'),
};

// ============================================
// Category APIs
// ============================================
export const categoryApi = {
  list: () =>
    apiFetch<any>('/api/categories'),

  getBySlug: (slug: string) =>
    apiFetch<any>(`/api/categories/${slug}`),
};

// ============================================
// Cart APIs (Requires Auth)
// ============================================
export const cartApi = {
  get: (token: string) =>
    apiFetch<any>('/api/cart', { token }),

  addItem: (token: string, data: { productId: string; quantity: number; colorId?: string; sizeId?: string }) =>
    apiFetch<any>('/api/cart', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  updateItem: (token: string, itemId: string, quantity: number) =>
    apiFetch<any>(`/api/cart/items/${itemId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (token: string, itemId: string) =>
    apiFetch<any>(`/api/cart/items/${itemId}`, {
      method: 'DELETE',
      token,
    }),

  clear: (token: string) =>
    apiFetch<any>('/api/cart', {
      method: 'DELETE',
      token,
    }),
};

// ============================================
// Wishlist APIs (Requires Auth)
// ============================================
export const wishlistApi = {
  get: (token: string) =>
    apiFetch<any>('/api/wishlist', { token }),

  addItem: (token: string, productId: string) =>
    apiFetch<any>('/api/wishlist', {
      method: 'POST',
      token,
      body: JSON.stringify({ productId }),
    }),

  removeItem: (token: string, productId: string) =>
    apiFetch<any>(`/api/wishlist/${productId}`, {
      method: 'DELETE',
      token,
    }),
};

// ============================================
// Order APIs (Requires Auth)
// ============================================
export const orderApi = {
  list: (token: string) =>
    apiFetch<any>('/api/orders', { token }),

  getById: (token: string, orderId: string) =>
    apiFetch<any>(`/api/orders/${orderId}`, { token }),
};

// ============================================
// Payment APIs (Requires Auth)
// ============================================
export const paymentApi = {
  createIntent: (token: string, data: { paymentGateway: 'stripe' | 'razorpay'; shippingAddressId: string; billingAddressId?: string }) =>
    apiFetch<any>('/api/payments/create-intent', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
};

// ============================================
// User APIs (Requires Auth)
// ============================================
export const userApi = {
  getProfile: (token: string) =>
    apiFetch<any>('/api/users/profile', { token }),

  getAddresses: (token: string) =>
    apiFetch<any>('/api/users/addresses', { token }),

  addAddress: (token: string, data: any) =>
    apiFetch<any>('/api/users/addresses', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
};

// ============================================
// Admin APIs (Requires Admin Auth)
// ============================================
export const adminApi = {
  getDashboard: (token: string) =>
    apiFetch<any>('/api/admin/dashboard', { token }),

  // Users
  getUsers: (token: string) =>
    apiFetch<any>('/api/admin/users', { token }),

  updateUserRole: (token: string, userId: string, role: string) =>
    apiFetch<any>(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ role }),
    }),

  // Products
  getProducts: (token: string) =>
    apiFetch<any>('/api/admin/products', { token }),

  createProduct: (token: string, data: any) =>
    apiFetch<any>('/api/admin/products', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  updateProduct: (token: string, productId: string, data: any) =>
    apiFetch<any>(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  deleteProduct: (token: string, productId: string) =>
    apiFetch<any>(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      token,
    }),

  // Orders
  getOrders: (token: string) =>
    apiFetch<any>('/api/admin/orders', { token }),

  updateOrderStatus: (token: string, orderId: string, status: string) =>
    apiFetch<any>(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    }),

  // Categories
  getCategories: (token: string) =>
    apiFetch<any>('/api/admin/categories', { token }),

  createCategory: (token: string, data: any) =>
    apiFetch<any>('/api/admin/categories', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  updateCategory: (token: string, categoryId: string, data: any) =>
    apiFetch<any>(`/api/admin/categories/${categoryId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),

  deleteCategory: (token: string, categoryId: string) =>
    apiFetch<any>(`/api/admin/categories/${categoryId}`, {
      method: 'DELETE',
      token,
    }),
};

export { API_BASE_URL };
