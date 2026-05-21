// API client for same-origin Next.js routes.
// Endpoints are relative paths (e.g. "/api/products"); the browser resolves
// them against the current origin. Auth.js session cookies are sent
// automatically on same-origin requests, so route handlers authenticate via
// `requireAuth()` with no token plumbing needed.

/**
 * Identity helper kept for backwards compatibility with any caller still
 * importing it. Relative paths are returned as-is.
 */
export function getApiUrl(endpoint: string): string {
  return endpoint;
}

/**
 * Simple same-origin fetch wrapper. The session cookie rides along
 * automatically; callers do not pass tokens.
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
  return fetch(endpoint, options);
}

/**
 * Base fetch wrapper for same-origin Next.js API calls. The Auth.js session
 * cookie is sent automatically (`credentials: 'same-origin'`), so protected
 * routes work without an Authorization header.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(endpoint, {
    credentials: 'same-origin',
    ...options,
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
// Cart APIs (Requires Auth — session cookie)
// ============================================
export const cartApi = {
  get: () =>
    apiFetch<any>('/api/cart'),

  addItem: (data: { productId: string; quantity: number; colorId?: string; sizeId?: string }) =>
    apiFetch<any>('/api/cart', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (itemId: string, quantity: number) =>
    apiFetch<any>(`/api/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (itemId: string) =>
    apiFetch<any>(`/api/cart/items/${itemId}`, {
      method: 'DELETE',
    }),

  clear: () =>
    apiFetch<any>('/api/cart', {
      method: 'DELETE',
    }),
};

// ============================================
// Wishlist APIs (Requires Auth — session cookie)
// ============================================
export const wishlistApi = {
  get: () =>
    apiFetch<any>('/api/wishlist'),

  addItem: (productId: string) =>
    apiFetch<any>('/api/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),

  removeItem: (productId: string) =>
    apiFetch<any>(`/api/wishlist/${productId}`, {
      method: 'DELETE',
    }),
};

// ============================================
// Order APIs (Requires Auth — session cookie)
// ============================================
export const orderApi = {
  list: () =>
    apiFetch<any>('/api/orders'),

  getById: (orderId: string) =>
    apiFetch<any>(`/api/orders/${orderId}`),
};

// ============================================
// Payment APIs (Requires Auth — session cookie)
// ============================================
export const paymentApi = {
  createIntent: (data: { paymentGateway: 'stripe' | 'razorpay'; shippingAddressId: string; billingAddressId?: string }) =>
    apiFetch<any>('/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================
// User APIs (Requires Auth — session cookie)
// ============================================
export const userApi = {
  getProfile: () =>
    apiFetch<any>('/api/users/profile'),

  getAddresses: () =>
    apiFetch<any>('/api/users/addresses'),

  addAddress: (data: any) =>
    apiFetch<any>('/api/users/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================
// Admin APIs (Requires Admin Auth — session cookie)
// ============================================
export const adminApi = {
  getDashboard: () =>
    apiFetch<any>('/api/admin/dashboard'),

  // Users
  getUsers: () =>
    apiFetch<any>('/api/admin/users'),

  updateUserRole: (userId: string, role: string) =>
    apiFetch<any>(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // Products
  getProducts: () =>
    apiFetch<any>('/api/admin/products'),

  createProduct: (data: any) =>
    apiFetch<any>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (productId: string, data: any) =>
    apiFetch<any>(`/api/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteProduct: (productId: string) =>
    apiFetch<any>(`/api/admin/products/${productId}`, {
      method: 'DELETE',
    }),

  // Orders
  getOrders: () =>
    apiFetch<any>('/api/admin/orders'),

  updateOrderStatus: (orderId: string, status: string) =>
    apiFetch<any>(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Categories
  getCategories: () =>
    apiFetch<any>('/api/admin/categories'),

  createCategory: (data: any) =>
    apiFetch<any>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (categoryId: string, data: any) =>
    apiFetch<any>(`/api/admin/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCategory: (categoryId: string) =>
    apiFetch<any>(`/api/admin/categories/${categoryId}`, {
      method: 'DELETE',
    }),
};
