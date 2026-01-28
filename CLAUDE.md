# Saakie_byknk - Claude Context File

## Project Overview
A premium fashion e-commerce platform built with Next.js 14, TypeScript, Prisma, MongoDB, and Clerk authentication. Features mobile-first design, comprehensive product management, user authentication, shopping cart, wishlist, order management, and a comprehensive admin dashboard with full CRUD operations.

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs on port 3001 if 3000 is occupied)
- `npm run build` - Build for production (includes Prisma client generation)
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks

### Database Operations
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:studio` - Open Prisma Studio GUI

### Development Tools
- `npm run ngrok` - Expose local server via ngrok for webhook testing

## Project Structure

```
app/                    # Next.js 14 App Router
├── (auth)/            # Authentication pages (sign-in, sign-up)
├── admin/             # Admin dashboard
│   ├── page.tsx       # Dashboard overview with stats
│   ├── users/         # User management
│   ├── products/      # Product management
│   ├── orders/        # Order management
│   └── categories/    # Category management
├── api/               # API routes
│   ├── admin/         # Admin API endpoints
│   │   ├── dashboard/ # Dashboard statistics
│   │   ├── users/     # User CRUD operations
│   │   ├── products/  # Product CRUD operations
│   │   ├── orders/    # Order management
│   │   └── categories/ # Category CRUD operations
│   ├── cart/          # Shopping cart API
│   ├── categories/    # Category API
│   ├── orders/        # Order API
│   ├── products/      # Product API
│   ├── users/         # User API
│   └── webhooks/      # Webhook endpoints
│       └── clerk/     # Clerk user webhooks
├── cart/              # Shopping cart pages
├── categories/        # Category browsing pages
├── products/          # Product detail pages
├── webhook-logs/      # Webhook monitoring page
├── globals.css        # Global styles
├── layout.tsx         # Root layout
└── page.tsx          # Home page

components/            # Reusable React components
├── auth/             # Authentication components
├── cart/             # Cart-related components
├── home/             # Home page components (hero, featured products, categories)
├── layout/           # Layout components (header, footer)
├── products/         # Product-related components
├── providers.tsx     # Context providers
└── ui/              # UI components (Radix UI based)
    └── badge.tsx     # Badge component for status indicators

lib/                  # Utility libraries
├── db.ts            # Database connection
├── users.ts         # User management utilities (create, update, delete)
└── utils.ts         # Utility functions

prisma/              # Database schema and migrations
└── schema.prisma    # Prisma schema file

types/               # TypeScript type definitions
```

## Database Schema (MongoDB via Prisma)

### Key Models
- **User** - Customer accounts with Clerk integration
  - Added: `imageUrl`, `profileImageUrl`, `gender` fields
  - Roles: USER, ADMIN, SUPER_ADMIN
- **Product** - Fashion products with variants, colors, sizes, images
- **Category** - Hierarchical product categories
- **Cart/CartItem** - Shopping cart functionality
- **Order/OrderItem** - Order management system
- **Wishlist/WishlistItem** - User wishlist feature
- **Review** - Product reviews and ratings
- **Address** - User shipping/billing addresses

### User Roles & Permissions
- **USER** (default) - Standard customer access
- **ADMIN** - Admin dashboard access, can manage users/products/orders
- **SUPER_ADMIN** - Full access including user deletion

### Order Status Flow
PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
(with CANCELLED, RETURNED, REFUNDED as alternative states)

### Payment Status
PENDING → PAID → FAILED/REFUNDED/CANCELLED

## Environment Variables

### Database
- `DATABASE_URL` - MongoDB connection string (required)

### Authentication (Clerk)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (required)
- `CLERK_SECRET_KEY` - Clerk secret key (required)
- `CLERK_WEBHOOK_SECRET` - Clerk webhook signature verification (required)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Sign-in page URL (default: /sign-in)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` - Sign-up page URL (default: /sign-up)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` - Redirect after sign-in (default: /)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` - Redirect after sign-up (default: /)

### Application
- `NEXT_PUBLIC_APP_URL` - Application base URL (required)

### Payment Gateways

#### Stripe
- `STRIPE_SECRET_KEY` - Stripe secret key (optional - required for Stripe payments)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature verification (optional - required for Stripe webhooks)

#### Razorpay
- `RAZORPAY_KEY_ID` - Razorpay key ID (optional - required for Razorpay payments)
- `RAZORPAY_KEY_SECRET` - Razorpay key secret (optional - required for Razorpay payments)
- `RAZORPAY_WEBHOOK_SECRET` - Razorpay webhook signature verification (optional - required for Razorpay webhooks)

### Instagram Integration
- `INSTAGRAM_ACCESS_TOKEN` - Instagram Basic Display API long-lived access token (optional - required for Instagram feed display on /post page)

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Webhook Processing**: Svix

## Admin Dashboard Features

### Dashboard Overview (`/admin`)
- **Real-time Statistics**: Users, orders, products, revenue metrics
- **Monthly Analytics**: Revenue tracking, active users, pending orders
- **Quick Actions**: Direct navigation to management sections
- **Recent Activity**: Latest orders and top-performing products

### User Management (`/admin/users`)
- **User Directory**: Complete user listing with profile images
- **Role Management**: Change user roles (USER/ADMIN/SUPER_ADMIN)
- **User Actions**: View, edit, delete user accounts
- **Advanced Search**: Filter by role, name, email
- **Pagination**: Efficient handling of large user datasets
- **Activity Tracking**: Order count, review count per user

### Product Management (`/admin/products`)
- **Product Catalog**: Visual product listing with images
- **Add Product Form**: Complete product creation with modal interface
- **Inventory Control**: Stock levels, low stock alerts
- **Status Management**: Active/inactive, featured products
- **Category Organization**: Filter and organize by categories
- **Product Details**: Material, pattern, occasion, dimensions
- **Bulk Operations**: Toggle multiple product statuses
- **Stock Monitoring**: Visual indicators for inventory levels
- **Schema-Aligned**: Proper field mapping with database schema

### Order Management (`/admin/orders`)
- **Order Pipeline**: Complete order lifecycle tracking
- **Status Updates**: Real-time order status management
- **Payment Tracking**: Payment status monitoring
- **Customer Information**: User details and order history
- **Advanced Filtering**: By status, payment, date ranges
- **Order Analytics**: Revenue tracking, order patterns

### Category Management (`/admin/categories`)
- **Hierarchical Structure**: Parent/child category relationships
- **CRUD Operations**: Create, read, update, delete categories
- **Product Association**: Track products per category
- **Status Control**: Active/inactive category management
- **Tree Navigation**: Visual category hierarchy
- **Bulk Management**: Mass category operations

## Webhook Integration

### Clerk Webhooks (`/api/webhooks/clerk`)
- **User Lifecycle**: Automatic user creation/update/deletion
- **Profile Sync**: Image URL, gender, and profile data sync
- **Cart/Wishlist**: Auto-creation for new users
- **Webhook Logging**: Real-time webhook monitoring at `/webhook-logs`
- **Security**: SVix signature verification

### Webhook Monitoring (`/webhook-logs`)
- **Real-time Logging**: Live webhook event tracking
- **Event Details**: Complete webhook payload inspection
- **Status Monitoring**: Success/failure tracking
- **Admin Access**: Webhook debugging for administrators

## Key Features

### User Experience
- Mobile-responsive design
- Progressive Web App (PWA) capabilities
- User authentication (Clerk)
- Product catalog with advanced filtering
- Shopping cart and wishlist functionality
- Order tracking and management
- Product reviews and ratings
- Multiple address management
- Category hierarchy navigation

### Admin Experience
- Comprehensive admin dashboard
- Real-time analytics and statistics
- Complete CRUD operations for all entities
- Role-based access control
- Webhook monitoring and debugging
- Inventory management
- Order processing workflow
- User management and role assignment

### Security & Performance
- Clerk authentication integration
- Role-based access control (RBAC)
- Secure API endpoints with authentication
- Webhook signature verification
- Optimized database queries
- Efficient pagination
- Image optimization
- Error handling and logging

## Development Notes
- Uses Next.js 14 App Router
- TypeScript strict mode enabled
- Prisma for database operations
- Path alias `@/*` maps to project root
- MongoDB as primary database
- Clerk handles all authentication flows
- SVix for webhook processing
- Middleware for admin route protection
- Build process includes Prisma client generation

## API Architecture

### Admin APIs
- **GET /api/admin/dashboard** - Dashboard statistics
- **GET /api/admin/users** - User listing
- **PATCH /api/admin/users/[id]** - Update user role
- **DELETE /api/admin/users/[id]** - Delete user (SUPER_ADMIN only)
- **GET /api/admin/products** - Product listing
- **POST /api/admin/products** - Create new product
- **PATCH /api/admin/products/[id]** - Update product
- **DELETE /api/admin/products/[id]** - Delete product
- **GET /api/admin/orders** - Order listing
- **PATCH /api/admin/orders/[id]** - Update order status
- **GET /api/admin/categories** - Category listing
- **POST /api/admin/categories** - Create category
- **PATCH /api/admin/categories/[id]** - Update category
- **DELETE /api/admin/categories/[id]** - Delete category

### Webhook APIs
- **POST /api/webhooks/clerk** - Clerk user webhooks
- **GET /api/webhook-logs** - Webhook log retrieval
- **POST /api/webhook-logs** - Webhook log storage

## Database Relationships

### User Relations
- One-to-One: Cart, Wishlist
- One-to-Many: Orders, Reviews, Addresses

### Product Relations
- Many-to-One: Category
- One-to-Many: Images, Colors, Sizes, Variants, Reviews
- Many-to-Many: Cart Items, Wishlist Items, Order Items

### Order Relations
- Many-to-One: User, Shipping Address, Billing Address
- One-to-Many: Order Items

## Current Status
- ✅ Complete admin dashboard implementation
- ✅ User management with role-based access
- ✅ Product management with inventory tracking
- ✅ **Product Creation Form** - Complete add product modal with validation
- ✅ Order management with status workflow
- ✅ Category management with hierarchy
- ✅ Webhook integration with Clerk
- ✅ Real-time webhook monitoring
- ✅ Authentication and authorization
- ✅ Database schema with all relationships (User fields updated)
- ✅ API architecture with full CRUD operations
- ✅ Responsive UI with Tailwind CSS
- ✅ Build process optimization
- ✅ Schema-aligned product creation with dimensions support