// Test data factories for generating mock data

export const createMockUser = (overrides = {}) => ({
  id: 'user_123',
  clerkId: 'clerk_user_123',
  email: 'test@example.com',
  name: 'Test User',
  phone: '+919876543210',
  imageUrl: 'https://example.com/avatar.jpg',
  profileImageUrl: 'https://example.com/profile.jpg',
  gender: 'female',
  role: 'USER' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockProduct = (overrides = {}) => ({
  id: 'product_123',
  name: 'Silk Saree',
  slug: 'silk-saree',
  description: 'Beautiful silk saree',
  price: 5999,
  comparePrice: 7999,
  stock: 10,
  sku: 'SKU-001',
  material: 'Silk',
  pattern: 'Woven',
  occasion: 'Wedding',
  careInstructions: 'Dry clean only',
  isActive: true,
  isFeatured: true,
  categoryId: 'cat_123',
  dimensions: null,
  weight: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  images: [
    { id: 'img_1', url: 'https://example.com/image1.jpg', alt: 'Saree 1', isPrimary: true, productId: 'product_123' },
  ],
  colors: [
    { id: 'color_1', name: 'Red', hexCode: '#FF0000', productId: 'product_123' },
  ],
  sizes: [
    { id: 'size_1', name: 'Free Size', productId: 'product_123' },
  ],
  category: {
    id: 'cat_123',
    name: 'Sarees',
    slug: 'sarees',
  },
  _count: {
    reviews: 5,
    orderItems: 20,
  },
  ...overrides,
})

export const createMockCategory = (overrides = {}) => ({
  id: 'cat_123',
  name: 'Sarees',
  slug: 'sarees',
  description: 'Traditional Indian sarees',
  imageUrl: 'https://example.com/category.jpg',
  isActive: true,
  parentId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  _count: {
    products: 10,
  },
  ...overrides,
})

export const createMockCart = (overrides = {}) => ({
  id: 'cart_123',
  userId: 'user_123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  items: [],
  ...overrides,
})

export const createMockCartItem = (overrides = {}) => ({
  id: 'cart_item_123',
  cartId: 'cart_123',
  productId: 'product_123',
  quantity: 1,
  price: 5999,
  color: null,
  size: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  product: createMockProduct(),
  ...overrides,
})

export const createMockOrder = (overrides = {}) => ({
  id: 'order_123',
  orderNumber: 'ORD-2024-001',
  userId: 'user_123',
  status: 'PENDING' as const,
  paymentStatus: 'PENDING' as const,
  paymentMethod: null,
  subtotal: 5999,
  tax: 540,
  shipping: 0,
  discount: 0,
  total: 6539,
  shippingAddressId: 'addr_1',
  billingAddressId: 'addr_1',
  notes: null,
  trackingNumber: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  items: [],
  ...overrides,
})

export const createMockOrderItem = (overrides = {}) => ({
  id: 'order_item_123',
  orderId: 'order_123',
  productId: 'product_123',
  quantity: 1,
  price: 5999,
  color: null,
  size: null,
  product: createMockProduct(),
  ...overrides,
})

export const createMockAddress = (overrides = {}) => ({
  id: 'addr_123',
  userId: 'user_123',
  name: 'Test User',
  phone: '+919876543210',
  street: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  zipCode: '400001',
  country: 'India',
  isDefault: true,
  type: 'SHIPPING' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockReview = (overrides = {}) => ({
  id: 'review_123',
  userId: 'user_123',
  productId: 'product_123',
  rating: 5,
  title: 'Excellent product!',
  comment: 'Really loved this saree. Great quality.',
  isVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  user: createMockUser(),
  ...overrides,
})

export const createMockHeroSlide = (overrides = {}) => ({
  id: 'slide_123',
  title: 'New Collection',
  subtitle: 'Discover our latest arrivals',
  imageUrl: 'https://example.com/hero.jpg',
  buttonText: 'Shop Now',
  buttonLink: '/products',
  isActive: true,
  order: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
})

export const createMockPromotionalBanner = (overrides = {}) => ({
  id: 'banner_123',
  title: '50% Off',
  subtitle: 'On all sarees',
  imageUrl: 'https://example.com/banner.jpg',
  link: '/products?discount=50',
  isActive: true,
  ...overrides,
})

// Helper to create multiple items
export const createMany = <T>(factory: (overrides?: Record<string, unknown>) => T, count: number, overridesFn?: (index: number) => Record<string, unknown>): T[] => {
  return Array.from({ length: count }, (_, index) => factory(overridesFn ? overridesFn(index) : {}))
}
