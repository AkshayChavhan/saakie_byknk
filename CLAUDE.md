# SareeShop - Claude Context File

## Project Overview
A premium saree e-commerce platform built with Next.js 14, TypeScript, Prisma, MongoDB, and Clerk authentication. Features mobile-first design, comprehensive product management, user authentication, shopping cart, wishlist, order management, and admin dashboard.

## Development Commands

### Core Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks

### Database Operations
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:push` - Push schema changes to database
- `npm run prisma:studio` - Open Prisma Studio GUI

## Project Structure

```
app/                    # Next.js 14 App Router
├── (auth)/            # Authentication pages (sign-in, sign-up)
├── admin/             # Admin dashboard (categories, orders, products, users)
├── api/               # API routes (cart, categories, orders, products, users, webhooks)
├── cart/              # Shopping cart pages
├── categories/        # Category browsing pages
├── products/          # Product detail pages
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

lib/                  # Utility libraries
├── db.ts            # Database connection
└── utils.ts         # Utility functions

prisma/              # Database schema and migrations
└── schema.prisma    # Prisma schema file

types/               # TypeScript type definitions
```

## Database Schema (MongoDB via Prisma)

### Key Models
- **User** - Customer accounts with Clerk integration
- **Product** - Saree products with variants, colors, sizes, images
- **Category** - Hierarchical product categories
- **Cart/CartItem** - Shopping cart functionality
- **Order/OrderItem** - Order management system
- **Wishlist/WishlistItem** - User wishlist feature
- **Review** - Product reviews and ratings
- **Address** - User shipping/billing addresses

### User Roles
- USER (default)
- ADMIN
- SUPER_ADMIN

### Order Status Flow
PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
(with CANCELLED, RETURNED, REFUNDED as alternative states)

## Environment Variables

Required environment variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `CLERK_SECRET_KEY` - Clerk secret
- `DATABASE_URL` - MongoDB connection string
- `NEXT_PUBLIC_APP_URL` - Application URL

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React

## Key Features
- Mobile-responsive design
- User authentication (Clerk)
- Product catalog with filtering
- Shopping cart and wishlist
- Order management system
- Admin dashboard
- Product reviews and ratings
- Multiple address management
- Category hierarchy
- Product variants (colors, sizes)

## Development Notes
- Uses Next.js 14 App Router
- TypeScript strict mode enabled
- Prisma for database operations
- Path alias `@/*` maps to project root
- MongoDB as primary database
- Clerk handles all authentication flows