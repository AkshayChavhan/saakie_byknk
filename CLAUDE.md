# Saakie_byknk - Claude Context File

## Git & Code Management Rules (MANDATORY)

### Branch Rule — `clerk-auth-no-merge`
- This branch moves authentication from Auth.js to Clerk. **It must NEVER be merged into `main`**, and no pull request may target `main` from it.
- `main` stays on Auth.js. The last Auth.js state is commit `dc30340` (local tag `authjs-before-clerk`).
- The way back from Clerk to Auth.js is documented in `docs/AUTHENTICATION.md` → "Going back to Auth.js".

### Commit Rules
- **NEVER commit code without explicit user permission** - Always ask before running `git commit`
- **NEVER push code without explicit user permission** - Always ask before running `git push`
- **NEVER merge code without explicit user permission** - Always ask before running `git merge`
- **After completing any code implementation or bug fix**, suggest a commit message with:
  - A concise commit title (50 chars max)
  - A descriptive body explaining what was changed and why
  - Wait for user approval before committing

### Pre-Commit Checklist
Before suggesting a commit, always verify:
1. Run `npm run build` to check for build errors
2. Run `npm run lint` to check for linting issues
3. Check Vercel deployment status if connected
4. Check GitHub Actions/build status if applicable
5. Report any errors to the user before proceeding

### Commit Message Format
```
<type>: <short description>

<detailed description of changes>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: feat, fix, docs, style, refactor, test, chore

### Example Workflow
1. Complete code implementation
2. Run build and lint checks
3. Report results to user
4. Suggest commit name and description
5. **Wait for explicit permission** to commit
6. **Wait for explicit permission** to push
7. Verify deployment status after push

---

## Project Overview
A premium fashion e-commerce platform built with Next.js 15, TypeScript, Prisma, MongoDB, and Clerk authentication (email + password, email code, Google/GitHub). Features mobile-first design, comprehensive product management, user authentication, shopping cart, wishlist, order management, and a comprehensive admin dashboard with full CRUD operations.

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
├── (auth)/            # Clerk sign-in / sign-up pages (catch-all folders)
├── admin/             # Admin dashboard
│   ├── page.tsx       # Dashboard overview with stats
│   ├── users/         # User management
│   ├── products/      # Product management
│   ├── orders/        # Order management
│   ├── categories/    # Category management
│   ├── settings/      # Store-wide switches (shipping fee on/off)
│   └── backup/        # Database backups (SUPER_ADMIN)
├── api/               # API routes
│   ├── admin/         # Admin API endpoints
│   │   ├── dashboard/ # Dashboard statistics
│   │   ├── users/     # User CRUD operations
│   │   ├── products/  # Product CRUD operations
│   │   ├── orders/    # Order management
│   │   ├── categories/ # Category CRUD operations
│   │   ├── settings/  # Store settings read/update (admin)
│   │   └── backup/    # Run a backup / list backup history (SUPER_ADMIN)
│   ├── cart/          # Shopping cart API
│   ├── categories/    # Category API
│   ├── orders/        # Order API
│   ├── products/      # Product API
│   ├── users/         # User API
│   └── webhooks/      # Webhook endpoints
│       ├── clerk/     # Clerk user sync (created/updated/deleted)
│       ├── razorpay/  # Razorpay payment webhooks
│       └── stripe/    # Stripe payment webhooks
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
    └── badge.tsx     # Badge component for status indicators

lib/                  # Utility libraries
├── db.ts            # Database connection
├── users.ts         # User management utilities (create, update, delete)
├── utils.ts         # Utility functions
├── shipping.ts      # Shared shipping maths — fee, threshold, admin toggle
├── auth-client.ts   # Client auth seam — useSession / signOut (Clerk-backed)
└── server/
    ├── settings.ts  # Store settings singleton (read + update)
    └── backup.ts    # Whole-database snapshot copy to a separate cluster

prisma/              # Database schema and migrations
└── schema.prisma    # Prisma schema file

types/               # TypeScript type definitions
```

## Database Schema (MongoDB via Prisma)

### Key Models
- **User** - Customer accounts, linked to Clerk by `clerkId` (`password` / `emailVerified` are unused but kept for the return to Auth.js)
  - Added: `imageUrl`, `profileImageUrl`, `gender` fields
  - Roles: USER, ADMIN, SUPER_ADMIN
- **VerificationToken** - Unused on this branch; kept for the return to Auth.js
- **Product** - Fashion products with variants, colors, sizes, images
- **Category** - Hierarchical product categories
- **Cart/CartItem** - Shopping cart functionality
- **Order/OrderItem** - Order management system
- **Wishlist/WishlistItem** - User wishlist feature
- **Review** - Product reviews and ratings
- **Address** - User shipping/billing addresses
- **StoreSettings** - Store-wide admin switches, one document keyed `default` (`shippingEnabled`)
- **BackupRun** - One row per backup run (snapshot stamp, status, per-collection counts); the authoritative manifest lives in the backup database

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
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (required — the app does not start without it)
- `CLERK_SECRET_KEY` - Clerk secret key (required)
- `CLERK_WEBHOOK_SIGNING_SECRET` - Verifies `/api/webhooks/clerk` deliveries (required for the webhook only)
- Clerk sends verification and reset emails itself; no SMTP variables are read

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

### Database Backups
- `BACKUP_DATABASE_URL` - Connection string for a database on a **separate cluster**; required for `/admin/backup` (see docs/BACKUP.md)

### Instagram Integration
- `INSTAGRAM_ACCESS_TOKEN` - Instagram Basic Display API long-lived access token (optional - required for Instagram feed display on /post page)

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: Clerk (`@clerk/nextjs` v7) — sign-in methods configured in the Clerk dashboard
- **Email**: Sent by Clerk (verification, password reset, email codes)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React

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

### Store Settings (`/admin/settings`)
- **Charge shipping fee**: toggle off and every order ships free, whatever the subtotal; on (default) charges ₹99 up to ₹999 and free above
- **Applies live**: saved to `store_settings` and read on the next cart/checkout load — no deploy
- **Past orders unaffected**: `Order.shipping` is stamped at creation
- **Server-authoritative**: `/api/payments/create-intent` recomputes shipping from the database, so the client cannot talk the store into free delivery
- Full details: `docs/STORE_SETTINGS.md`

### Backups (`/admin/backup`) — SUPER_ADMIN only
- **Back up now**: copies every collection to a separate backup database as a timestamped snapshot
- **Snapshots, not a mirror**: the last 5 runs are kept, so corruption copied over one generation does not destroy the others
- **Self-describing**: a `_backup_runs` manifest is written into the backup database, so a restore works even if the live database is gone
- **Downloads a copy too**: each run also downloads `saakie-backup-<snapshot>.json` to the admin's computer (canonical Extended JSON, so ObjectIds/Dates restore intact); past snapshots have a Download button
- **Refuses to run against the live database** (host + database name compared), and redacts credentials from every message
- **Restore is a CLI script**, not a button: `node scripts/restore-backup.mjs`
- Full details: `docs/BACKUP.md`

## Auth Flow (signup email verification)

- `POST /api/auth/register` creates the User (`emailVerified: null`) + Cart +
  Wishlist, then emails a confirmation link (token stored as SHA-256 hash,
  24 h TTL). No auto-login — the sign-up page shows "check your email".
- `GET /auth/confirm?token=…` verifies the link, stamps `emailVerified`, and
  redirects to `/sign-in?verified=1`.
- `authorize()` in `auth.ts` refuses unverified accounts with a
  `CredentialsSignin` subclass (`code: 'email_not_verified'`); the sign-in page
  offers a rate-limited resend via `POST /api/auth/resend-verification`.
- Full walkthrough: `docs/AUTHENTICATION.md`; email/Resend setup: `docs/RESEND.md`.
- `scripts/backfill-email-verified.mjs` stamps accounts that predate the feature.

## Webhook Integration

### Auth Webhook
- `POST /api/webhooks/clerk` — Clerk user events (signature-verified)

### Payment Webhooks
- `POST /api/webhooks/razorpay` — Razorpay payment events (signature-verified)
- `POST /api/webhooks/stripe` — Stripe payment events (signature-verified)

## Key Features

### User Experience
- Mobile-responsive design
- Progressive Web App (PWA) capabilities
- User authentication (Clerk: password, email code, Google/GitHub)
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
- Clerk authentication with verified-email account linking
- Role-based access control (RBAC)
- Secure API endpoints with authentication
- Payment-webhook signature verification
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
- Clerk handles all authentication flows, behind auth.ts / lib/auth-client.ts
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

### Store Settings APIs
- **GET /api/settings** - Public `{ shippingEnabled }` for cart/checkout totals
- **GET /api/admin/settings** - Full store settings (admin)
- **PATCH /api/admin/settings** - Update settings, e.g. `{ shippingEnabled: false }` (admin)

### Backup APIs
- **GET /api/admin/backup** - Backup history + whether a destination is configured (SUPER_ADMIN)
- **POST /api/admin/backup** - Run a backup now (SUPER_ADMIN)
- **GET /api/admin/backup/[snapshot]/download** - Download a snapshot as a JSON file (SUPER_ADMIN)

### Auth APIs
- Sign-up, sign-in and verification are served by Clerk — there are no `/api/auth/*` routes
- **GET /api/users/profile** - The signed-in store user (also what `useSession()` loads)

### Webhook APIs
- **POST /api/webhooks/clerk** - Clerk user sync
- **POST /api/webhooks/razorpay** - Razorpay payment webhooks
- **POST /api/webhooks/stripe** - Stripe payment webhooks

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
- ✅ Payment webhook integration (Razorpay, Stripe)
- ✅ Authentication and authorization (Clerk sign-in + MongoDB roles)
- ✅ Email verification, forgot password, email code and social login (via Clerk)
- ✅ Database schema with all relationships (User fields updated)
- ✅ API architecture with full CRUD operations
- ✅ Responsive UI with Tailwind CSS
- ✅ Build process optimization
- ✅ Schema-aligned product creation with dimensions support
- ✅ Store settings with an admin shipping-fee toggle (off ⇒ free shipping on every order)
- ✅ On-demand database backups to a separate cluster, with snapshot retention, a downloaded file copy, and a CLI restore