'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import {
  productApi,
  categoryApi,
  cartApi,
  wishlistApi,
  orderApi,
  userApi,
  adminApi,
  ProductListParams,
} from '@/lib/api';

// ============================================
// Product Hooks
// ============================================
export function useProducts(params?: ProductListParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.list(params),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => productApi.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productApi.getFeatured(),
  });
}

// ============================================
// Category Hooks
// ============================================
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list(),
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoryApi.getBySlug(slug),
    enabled: !!slug,
  });
}

// ============================================
// Cart Hooks
// ============================================
export function useCart() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cartApi.get(token);
    },
  });
}

export function useAddToCart() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { productId: string; quantity: number; colorId?: string; sizeId?: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cartApi.addItem(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useUpdateCartItem() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cartApi.updateItem(token, itemId, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveCartItem() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cartApi.removeItem(token, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useClearCart() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cartApi.clear(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// ============================================
// Wishlist Hooks
// ============================================
export function useWishlist() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return wishlistApi.get(token);
    },
  });
}

export function useAddToWishlist() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return wishlistApi.addItem(token, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useRemoveFromWishlist() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return wishlistApi.removeItem(token, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

// ============================================
// Order Hooks
// ============================================
export function useOrders() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return orderApi.list(token);
    },
  });
}

export function useOrder(orderId: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return orderApi.getById(token, orderId);
    },
    enabled: !!orderId,
  });
}

// ============================================
// User Hooks
// ============================================
export function useUserProfile() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return userApi.getProfile(token);
    },
  });
}

export function useUserAddresses() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['user', 'addresses'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return userApi.getAddresses(token);
    },
  });
}

// ============================================
// Admin Hooks
// ============================================
export function useAdminDashboard() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return adminApi.getDashboard(token);
    },
  });
}

export function useAdminUsers() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return adminApi.getUsers(token);
    },
  });
}

export function useAdminProducts() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return adminApi.getProducts(token);
    },
  });
}

export function useAdminOrders() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return adminApi.getOrders(token);
    },
  });
}

export function useAdminCategories() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return adminApi.getCategories(token);
    },
  });
}

export function useUpdateOrderStatus() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return adminApi.updateOrderStatus(token, orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}
