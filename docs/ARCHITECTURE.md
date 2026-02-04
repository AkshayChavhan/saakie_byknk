# Backend Architecture & Folder Structure

Complete documentation of the Express backend architecture, folder structure, and implementation details.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Folder Structure](#folder-structure)
3. [File Descriptions](#file-descriptions)
4. [Database Schema](#database-schema)
5. [Middleware Pipeline](#middleware-pipeline)
6. [Error Handling](#error-handling)
7. [Configuration](#configuration)

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         CLIENT LAYER                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Web Browser │  │  Mobile App  │  │  Admin Panel │              │   │
│  │  │  (Next.js)   │  │  (Future)    │  │  (Next.js)   │              │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │   │
│  └─────────┼─────────────────┼─────────────────┼────────────────────────┘   │
│            │                 │                 │                             │
│            └─────────────────┼─────────────────┘                             │
│                              │ HTTPS                                         │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API GATEWAY                                  │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │                    GCP Cloud Run / VM                         │  │   │
│  │  │  ┌────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │                   Express.js Server                     │  │  │   │
│  │  │  │                                                         │  │  │   │
│  │  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │  │   │
│  │  │  │  │   Helmet     │  │    CORS      │  │  Rate Limit  │ │  │  │   │
│  │  │  │  │  (Security)  │  │              │  │  (Optional)  │ │  │  │   │
│  │  │  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │  │   │
│  │  │  │                                                         │  │  │   │
│  │  │  │  ┌────────────────────────────────────────────────────┐│  │  │   │
│  │  │  │  │              Authentication Middleware              ││  │  │   │
│  │  │  │  │         (Clerk JWT Token Verification)             ││  │  │   │
│  │  │  │  └────────────────────────────────────────────────────┘│  │  │   │
│  │  │  │                                                         │  │  │   │
│  │  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │  │   │
│  │  │  │  │ Products │ │  Cart    │ │  Orders  │ │  Admin   │ │  │  │   │
│  │  │  │  │ Routes   │ │  Routes  │ │  Routes  │ │  Routes  │ │  │  │   │
│  │  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │  │   │
│  │  │  │                                                         │  │  │   │
│  │  │  └─────────────────────────┬───────────────────────────────┘  │  │   │
│  │  └────────────────────────────┼──────────────────────────────────┘  │   │
│  └───────────────────────────────┼─────────────────────────────────────┘   │
│                                  │                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER                                   │   │
│  │                                                                      │   │
│  │  ┌────────────────────┐                                             │   │
│  │  │   Prisma ORM       │                                             │   │
│  │  │   (Query Builder)  │                                             │   │
│  │  └─────────┬──────────┘                                             │   │
│  │            │                                                         │   │
│  │            ▼                                                         │   │
│  │  ┌────────────────────┐                                             │   │
│  │  │   MongoDB Atlas    │                                             │   │
│  │  │   (Database)       │                                             │   │
│  │  └────────────────────┘                                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      EXTERNAL SERVICES                               │   │
│  │                                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐       │   │
│  │  │  Clerk   │  │  Stripe  │  │ Razorpay │  │  Cloudinary  │       │   │
│  │  │  (Auth)  │  │(Payments)│  │(Payments)│  │   (Images)   │       │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Layer | Component | Purpose |
|-------|-----------|---------|
| **Client** | Web Browser, Admin Panel | User interfaces |
| **API Gateway** | Express.js on GCP | Request handling, routing |
| **Middleware** | Helmet, CORS, Auth | Security, validation |
| **Business Logic** | Route Handlers | API endpoints implementation |
| **Data Access** | Prisma ORM | Database queries |
| **Storage** | MongoDB Atlas | Data persistence |
| **External** | Clerk, Stripe, etc. | Third-party integrations |

---

## Folder Structure

```
saree-shop-backend/
│
├── src/                              # Source code
│   │
│   ├── index.ts                      # Application entry point
│   │
│   ├── routes/                       # API route handlers
│   │   ├── index.ts                  # Route aggregator
│   │   │
│   │   ├── products.routes.ts        # GET /products, /products/:slug
│   │   ├── categories.routes.ts      # GET /categories, /categories/:slug
│   │   ├── cart.routes.ts            # GET, POST, DELETE /cart
│   │   ├── orders.routes.ts          # GET, POST /orders
│   │   ├── wishlist.routes.ts        # GET, POST, DELETE /wishlist
│   │   ├── payments.routes.ts        # POST /payments/create-intent, /confirm
│   │   ├── auth.routes.ts            # GET /auth/check-role
│   │   │
│   │   ├── admin/                    # Admin-only routes
│   │   │   ├── index.ts              # Admin route aggregator
│   │   │   ├── dashboard.routes.ts   # GET /admin/dashboard
│   │   │   ├── users.routes.ts       # CRUD /admin/users
│   │   │   ├── products.routes.ts    # CRUD /admin/products
│   │   │   ├── orders.routes.ts      # GET, PATCH /admin/orders
│   │   │   └── categories.routes.ts  # CRUD /admin/categories
│   │   │
│   │   └── webhooks/                 # Webhook handlers
│   │       ├── clerk.routes.ts       # POST /webhooks/clerk
│   │       ├── stripe.routes.ts      # POST /webhooks/stripe
│   │       └── razorpay.routes.ts    # POST /webhooks/razorpay
│   │
│   ├── middleware/                   # Express middleware
│   │   ├── auth.middleware.ts        # JWT verification
│   │   ├── admin.middleware.ts       # Admin role check
│   │   ├── error.middleware.ts       # Global error handler
│   │   └── validation.middleware.ts  # Request validation
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── prisma.ts                 # Prisma client singleton
│   │   ├── cart.ts                   # Cart helper functions
│   │   ├── stripe.ts                 # Stripe configuration
│   │   ├── razorpay.ts               # Razorpay configuration
│   │   ├── cloudinary.ts             # Cloudinary configuration
│   │   └── utils.ts                  # General utilities
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── index.ts                  # Type exports
│   │   ├── express.d.ts              # Express type extensions
│   │   └── api.types.ts              # API request/response types
│   │
│   └── config/                       # Configuration
│       └── env.ts                    # Environment variable validation
│
├── prisma/                           # Database
│   └── schema.prisma                 # Prisma schema (copy from frontend)
│
├── dist/                             # Compiled JavaScript (generated)
│
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── Dockerfile                        # Docker configuration
├── .dockerignore                     # Docker ignore rules
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore rules
└── README.md                         # Project documentation
```

---

## File Descriptions

### Entry Point

**`src/index.ts`** - Application entry point

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api', routes);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Routes

**`src/routes/index.ts`** - Route aggregator

```typescript
import { Router } from 'express';
import productsRoutes from './products.routes';
import categoriesRoutes from './categories.routes';
import cartRoutes from './cart.routes';
import ordersRoutes from './orders.routes';
import wishlistRoutes from './wishlist.routes';
import paymentsRoutes from './payments.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin';
import webhooksRoutes from './webhooks';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();

// Public routes
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);

// Protected routes (user auth required)
router.use('/cart', requireAuth, cartRoutes);
router.use('/orders', requireAuth, ordersRoutes);
router.use('/wishlist', requireAuth, wishlistRoutes);
router.use('/payments', requireAuth, paymentsRoutes);
router.use('/auth', requireAuth, authRoutes);

// Admin routes
router.use('/admin', requireAuth, requireAdmin, adminRoutes);

// Webhook routes (no auth - uses signature verification)
router.use('/webhooks', webhooksRoutes);

export default router;
```

**`src/routes/products.routes.ts`**

```typescript
import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/products - List products with filters
router.get('/', async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, sort, inStock, page = 1, limit = 12 } = req.query;

    const where: any = { isActive: true };

    if (category) {
      where.category = { slug: category };
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    const orderBy: any = {};
    switch (sort) {
      case 'price-low': orderBy.price = 'asc'; break;
      case 'price-high': orderBy.price = 'desc'; break;
      case 'popular': orderBy.salesCount = 'desc'; break;
      default: orderBy.createdAt = 'desc';
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { images: true, colors: true, category: true }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
        hasNext: Number(page) * Number(limit) < totalCount,
        hasPrev: Number(page) > 1
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/featured - Featured products
router.get('/featured', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 8,
      include: { images: true, colors: true }
    });
    res.json({ success: true, products });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:slug - Single product
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        images: true,
        colors: true,
        sizes: true,
        variants: true,
        category: true,
        reviews: { include: { user: true } }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Middleware

**`src/middleware/auth.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { prisma } from '../lib/prisma';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      clerkId?: string;
      user?: any;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided', code: 'NO_TOKEN' }
      });
    }

    // Verify token with Clerk
    const session = await clerkClient.verifyToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: session.sub }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' }
      });
    }

    // Attach user info to request
    req.userId = user.id;
    req.clerkId = session.sub;
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid token', code: 'INVALID_TOKEN' }
    });
  }
};
```

**`src/middleware/admin.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
    });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: { message: 'Admin access required', code: 'FORBIDDEN' }
    });
  }

  next();
};

export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: { message: 'Super admin access required', code: 'FORBIDDEN' }
    });
  }

  next();
};
```

**`src/middleware/error.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  code = 'UNAUTHORIZED';

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  code = 'FORBIDDEN';

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
```

### Library Files

**`src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
```

**`src/lib/stripe.ts`**

```typescript
import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

export const isStripeEnabled = !!stripe;

// Convert INR to paise (Stripe expects smallest currency unit)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};
```

**`src/lib/razorpay.ts`**

```typescript
import Razorpay from 'razorpay';

export const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

export const isRazorpayEnabled = !!razorpay;

// Convert INR to paise
export const formatAmountForRazorpay = (amount: number): number => {
  return Math.round(amount * 100);
};
```

---

## Database Schema

### Core Models

```prisma
// User Model
model User {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  clerkId       String    @unique
  email         String    @unique
  firstName     String?
  lastName      String?
  imageUrl      String?
  profileImageUrl String?
  gender        String?
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  cart          Cart?
  wishlist      Wishlist?
  orders        Order[]
  reviews       Review[]
  addresses     Address[]
}

// Product Model
model Product {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  name          String
  slug          String    @unique
  description   String
  shortDescription String?
  price         Float
  comparePrice  Float?
  costPrice     Float?
  sku           String?   @unique
  stock         Int       @default(0)
  lowStockThreshold Int   @default(5)
  weight        Float?
  dimensions    Json?     // { length, width, height }
  material      String?
  pattern       String?
  occasion      String?
  isActive      Boolean   @default(true)
  isFeatured    Boolean   @default(false)
  isNew         Boolean   @default(false)
  isBestseller  Boolean   @default(false)
  salesCount    Int       @default(0)
  rating        Float     @default(0)
  reviewCount   Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  category      Category  @relation(fields: [categoryId], references: [id])
  categoryId    String    @db.ObjectId
  images        ProductImage[]
  colors        ProductColor[]
  sizes         ProductSize[]
  variants      ProductVariant[]
  reviews       Review[]
  cartItems     CartItem[]
  wishlistItems WishlistItem[]
  orderItems    OrderItem[]
}

// Order Model
model Order {
  id              String        @id @default(auto()) @map("_id") @db.ObjectId
  orderNumber     String        @unique
  status          OrderStatus   @default(PENDING)
  paymentStatus   PaymentStatus @default(PENDING)
  paymentMethod   String?
  paymentId       String?       // Stripe/Razorpay payment ID
  subtotal        Float
  shippingCost    Float         @default(0)
  discount        Float         @default(0)
  tax             Float         @default(0)
  total           Float
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  user            User          @relation(fields: [userId], references: [id])
  userId          String        @db.ObjectId
  items           OrderItem[]
  shippingAddress Address?      @relation("ShippingAddress", fields: [shippingAddressId], references: [id])
  shippingAddressId String?     @db.ObjectId
  billingAddress  Address?      @relation("BillingAddress", fields: [billingAddressId], references: [id])
  billingAddressId String?      @db.ObjectId
}

// Category Model
model Category {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  slug        String    @unique
  description String?
  image       String?
  isActive    Boolean   @default(true)
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Self-relation for hierarchy
  parentId    String?   @db.ObjectId
  parent      Category? @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  children    Category[] @relation("CategoryHierarchy")

  // Products
  products    Product[]
}
```

### Enums

```prisma
enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  RETURNED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  CANCELLED
}
```

---

## Middleware Pipeline

### Request Flow

```
Request
   │
   ▼
┌──────────────────┐
│     Helmet       │  Security headers (XSS, HSTS, etc.)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│      CORS        │  Cross-origin request handling
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   JSON Parser    │  Parse request body
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Auth Middleware │  Verify JWT token (protected routes)
│   (Optional)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Admin Middleware │  Check admin role (admin routes)
│   (Optional)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Route Handler   │  Business logic execution
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Error Middleware │  Global error handling
└────────┬─────────┘
         │
         ▼
    Response
```

### Middleware Configuration

| Middleware | Purpose | Applied To |
|------------|---------|------------|
| `helmet()` | Security headers | All routes |
| `cors()` | Cross-origin requests | All routes |
| `express.json()` | Body parsing | All routes |
| `requireAuth` | JWT verification | Protected routes |
| `requireAdmin` | Admin role check | Admin routes |
| `errorHandler` | Error handling | All routes |

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;  // Optional in development
    stack?: string; // Only in development
  };
}
```

### HTTP Status Codes

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST creating resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, state conflict |
| 422 | Unprocessable Entity | Valid syntax but semantic errors |
| 500 | Internal Server Error | Unexpected server errors |

### Error Codes

| Code | Description |
|------|-------------|
| `NO_TOKEN` | Authorization header missing |
| `INVALID_TOKEN` | JWT verification failed |
| `USER_NOT_FOUND` | User doesn't exist in database |
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Requested resource not found |
| `FORBIDDEN` | Insufficient permissions |
| `DUPLICATE_ENTRY` | Unique constraint violation |
| `SERVER_ERROR` | Unexpected error |

---

## Configuration

### Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development|production

# Database
DATABASE_URL="mongodb+srv://..."

# Frontend URL (for CORS)
FRONTEND_URL="https://your-frontend.vercel.app"

# Clerk Authentication
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Stripe Payments (Optional)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Razorpay Payments (Optional)
RAZORPAY_KEY_ID="rzp_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."

# Cloudinary (Images)
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

### TypeScript Configuration

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Docker Configuration

**`Dockerfile`**

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built code
COPY dist ./dist/

# Expose port
EXPOSE 8080
ENV PORT=8080

# Start server
CMD ["node", "dist/index.js"]
```

**`.dockerignore`**

```
node_modules
npm-debug.log
Dockerfile
.dockerignore
.git
.gitignore
.env
.env.*
dist
*.md
```

---

## Dependencies

### Production Dependencies

```json
{
  "@clerk/clerk-sdk-node": "^5.0.0",
  "@prisma/client": "^6.12.0",
  "cloudinary": "^2.7.0",
  "cors": "^2.8.5",
  "dotenv": "^16.4.0",
  "express": "^4.18.2",
  "helmet": "^7.1.0",
  "razorpay": "^2.9.6",
  "stripe": "^18.4.0",
  "svix": "^1.69.0"
}
```

### Development Dependencies

```json
{
  "@types/cors": "^2.8.17",
  "@types/express": "^4.17.21",
  "@types/node": "^20.11.0",
  "prisma": "^6.12.0",
  "ts-node-dev": "^2.0.0",
  "typescript": "^5.3.0"
}
```

---

## Quick Reference

### NPM Scripts

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:studio": "prisma studio"
  }
}
```

### Common Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Database
npm run prisma:generate
npm run prisma:push
npm run prisma:studio
```
