'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// Protected endpoints authenticate via the Auth.js session cookie, which the
// browser sends automatically on same-origin requests — no token plumbing.

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
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string; quantity: number; colorId?: string; sizeId?: string }) =>
      cartApi.addItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// ============================================
// Wishlist Hooks
// ============================================
export function useWishlist() {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.get(),
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => wishlistApi.addItem(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => wishlistApi.removeItem(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

// ============================================
// Order Hooks
// ============================================
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.list(),
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getById(orderId),
    enabled: !!orderId,
  });
}

// ============================================
// User Hooks
// ============================================
export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => userApi.getProfile(),
  });
}

export function useUserAddresses() {
  return useQuery({
    queryKey: ['user', 'addresses'],
    queryFn: () => userApi.getAddresses(),
  });
}

// ============================================
// Admin Hooks
// ============================================
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(),
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => adminApi.getProducts(),
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => adminApi.getOrders(),
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminApi.getCategories(),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      adminApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}
