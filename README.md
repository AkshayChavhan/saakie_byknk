# Saakie_byknk - Premium Fashion E-commerce Platform

A modern, mobile-first e-commerce platform for fashion retail, built with Next.js 15, TypeScript, Prisma, MongoDB, and Auth.js (NextAuth v5) credentials authentication with signup email verification. Features a comprehensive admin dashboard with full CRUD operations.

## ✨ Features

### 🛍️ User Experience
- 🔐 **Secure Authentication**: Auth.js (NextAuth v5) email + password login with signup email verification and profile management
- 📱 **Mobile-First Design**: Responsive UI optimized for all devices
- 🛒 **Shopping Cart**: Advanced cart management with quantity controls
- ❤️ **Wishlist**: Save favorite items for later
- 📦 **Order Tracking**: Complete order lifecycle management
- ⭐ **Reviews & Ratings**: Product review system
- 📍 **Address Management**: Multiple shipping addresses support
- 🔍 **Advanced Search**: Filter products by category, price, status
- 🏷️ **Category Navigation**: Hierarchical category browsing

### 🎛️ Admin Dashboard
- 📊 **Real-time Analytics**: Revenue, user, and order statistics
- 👥 **User Management**: Role-based access control (USER/ADMIN/SUPER_ADMIN)
- 🛍️ **Product Management**: Complete product catalog management
- 📋 **Category Management**: Hierarchical category organization
- 📦 **Order Management**: Order processing and status tracking
- 🔧 **Webhook Monitoring**: Real-time webhook event tracking
- 📈 **Inventory Control**: Stock levels and low stock alerts
- 🔒 **Security**: Role-based permissions and secure API endpoints

### 🔗 Integrations
- 📧 **Transactional Email**: Signup verification links over SMTP (Resend) — see [docs/RESEND.md](docs/RESEND.md)
- 💳 **Payment Webhooks**: Razorpay and Stripe webhook handling with signature verification
- 💾 **Data Persistence**: Automatic cart and wishlist creation on signup

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **State Management**: TanStack Query (React Query)

### Backend
- **Database**: MongoDB
- **ORM**: Prisma
- **Authentication**: Auth.js (NextAuth v5), Credentials provider, JWT sessions
- **Email**: Nodemailer over SMTP (Resend in production)
- **API**: RESTful API with Next.js API Routes

### DevOps & Tools
- **Deployment**: Vercel (recommended)
- **Environment**: Node.js 18+
- **Package Manager**: npm
- **Build Process**: Optimized with Prisma generation

## 📋 Prerequisites

- Node.js 20.x or later
- npm or pnpm
- MongoDB database (local or MongoDB Atlas)
- Resend account (or any SMTP provider) for verification emails — optional in dev, links print to the console
- Ngrok (optional, for payment-webhook testing)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/saakie-byknk.git
cd saakie-byknk
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the `.env.example` file to `.env.local` and update with your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values:

```env
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/saree-shop?retryWrites=true&w=majority"

# Authentication (Auth.js / NextAuth v5)
# Generate with: openssl rand -base64 32
AUTH_SECRET=your_generated_secret

# Email (SMTP) — signup verification links. Leave unset in dev to print
# links to the console instead. See docs/RESEND.md for the full setup.
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_your_resend_api_key
EMAIL_FROM="Saakie by KNK <no-reply@yourdomain.com>"

# Application URL
NEXT_PUBLIC_APP_URL=https://saakiebyknk.in

# Payment Gateways (Optional)

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Razorpay
RAZORPAY_KEY_ID=rzp_test_your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### 4. Database Setup

Generate Prisma client and push schema to database:

```bash
npm run prisma:generate
npm run prisma:push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## 📁 Project Structure

```
saakie-byknk/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── sign-in/       # Sign in page
│   │   └── sign-up/       # Sign up page (+ "check your email" screen)
│   ├── auth/
│   │   └── confirm/       # Email-confirmation link callback
│   ├── admin/             # Admin dashboard
│   │   ├── page.tsx       # Dashboard overview
│   │   ├── users/         # User management
│   │   ├── products/      # Product management
│   │   ├── orders/        # Order management
│   │   └── categories/    # Category management
│   ├── api/               # API routes
│   │   ├── admin/         # Admin API endpoints
│   │   │   ├── dashboard/ # Dashboard statistics
│   │   │   ├── users/     # User CRUD operations
│   │   │   ├── products/  # Product CRUD operations
│   │   │   ├── orders/    # Order management
│   │   │   └── categories/ # Category CRUD operations
│   │   ├── auth/          # Auth API (register, resend-verification, [...nextauth])
│   │   ├── cart/          # Shopping cart API
│   │   ├── categories/    # Category API
│   │   ├── orders/        # Order API
│   │   ├── products/      # Product API
│   │   ├── users/         # User API
│   │   └── webhooks/      # Webhook endpoints
│   │       ├── razorpay/  # Razorpay payment webhooks
│   │       └── stripe/    # Stripe payment webhooks
│   ├── cart/              # Shopping cart pages
│   ├── categories/        # Category browsing pages
│   ├── products/          # Product detail pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── auth/             # Authentication components
│   ├── cart/             # Cart components
│   ├── home/             # Home page components
│   ├── layout/           # Layout components (header, footer)
│   ├── products/         # Product components
│   ├── providers.tsx     # Context providers
│   └── ui/               # UI components
│       └── badge.tsx     # Badge component
├── lib/                  # Utility libraries
│   ├── prisma.ts        # Prisma client singleton
│   ├── server/          # Server-only helpers (auth, email, verification, rate-limit, …)
│   └── utils.ts         # Utility functions
├── prisma/              # Prisma schema and migrations
│   └── schema.prisma    # Database schema
├── public/              # Static assets
│   └── images/          # Product and UI images
├── types/               # TypeScript type definitions
└── middleware.ts        # Next.js middleware for auth
```

## 🗄️ Database Schema

### Core Models

#### User Model
```prisma
model User {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  email             String   @unique
  password          String?   // bcrypt hash; null for future OAuth-only users
  emailVerified     DateTime? // set when the signup confirmation link is clicked
  name              String?
  phone             String?
  imageUrl          String?
  profileImageUrl   String?
  gender            String?
  role              UserRole @default(USER)
  // Relations
  addresses         Address[]
  orders            Order[]
  cart              Cart?
  wishlist          Wishlist?
  reviews           Review[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

#### VerificationToken Model
```prisma
model VerificationToken {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  identifier String   // email address being verified
  token      String   @unique // SHA-256 hash of the emailed link token
  expires    DateTime // 24 h after issue
}
```

#### Product Model
```prisma
model Product {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  name          String
  slug          String   @unique
  description   String
  price         Float
  stock         Int      @default(0)
  lowStockAlert Int      @default(10)
  isActive      Boolean  @default(true)
  isFeatured    Boolean  @default(false)
  // Relations
  category      Category @relation(fields: [categoryId], references: [id])
  images        Image[]
  variants      Variant[]
  reviews       Review[]
  // ... other fields
}
```

### User Roles & Permissions

- **USER**: Standard customer access
- **ADMIN**: Admin dashboard access, manage products/orders/categories
- **SUPER_ADMIN**: Full access including user management and deletion

### Order Status Flow

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
```

Alternative states: `CANCELLED`, `RETURNED`, `REFUNDED`

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:push     # Push schema to database
npm run prisma:studio   # Open Prisma Studio

# Utilities
npm run ngrok        # Expose local server via ngrok
```

## 🎯 Admin Dashboard Features

### Dashboard Overview (`/admin`)
- 📊 Real-time statistics (users, orders, revenue)
- 📈 Monthly analytics and trends
- 🚀 Quick action buttons
- 📋 Recent activity feed

### User Management (`/admin/users`)
- 👥 Complete user directory
- 🔐 Role management (USER/ADMIN/SUPER_ADMIN)
- 🔍 Advanced search and filtering
- 📊 User activity tracking
- 🗑️ User deletion (SUPER_ADMIN only)

### Product Management (`/admin/products`)
- 📦 Visual product catalog
- ➕ **Add Product Form** - Complete product creation modal
- 📈 Inventory tracking with stock alerts
- ⭐ Featured product management
- 🏷️ Category organization
- 🔄 Bulk status updates
- 📏 Product dimensions and specifications
- 🎨 Material, pattern, and occasion fields

### Order Management (`/admin/orders`)
- 📋 Complete order pipeline
- 🔄 Status management
- 💳 Payment tracking
- 👤 Customer information
- 📊 Order analytics

### Category Management (`/admin/categories`)
- 🌳 Hierarchical category structure
- ➕ CRUD operations
- 📊 Product association tracking
- 🔄 Status management
- 🎯 Tree navigation

### Product Creation Form Features
- 📝 **Complete Product Form** - Modal-based product creation
- 🏷️ **Auto-generated Slugs** - SEO-friendly URLs from product names
- 🎨 **Rich Product Details** - Material, pattern, occasion, care instructions
- 📏 **Dimensions Support** - Length, width, height with separate dimension model
- 💰 **Pricing Options** - Regular price and compare-at price
- 📦 **Inventory Management** - Stock levels and low stock alerts
- 🏷️ **Category Integration** - Dynamic category dropdown
- ✅ **Form Validation** - Required fields and data type validation
- 🔄 **Status Controls** - Active/inactive and featured toggles
- 👗 **Fashion-specific Fields** - Blouse included, fabric type, work type
- 🎯 **Schema-aligned** - Perfect mapping with database structure

## 🔗 API Endpoints

### Admin APIs

#### Dashboard
- `GET /api/admin/dashboard` - Get dashboard statistics

#### User Management
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/[id]` - Update user role
- `DELETE /api/admin/users/[id]` - Delete user (SUPER_ADMIN only)

#### Product Management
- `GET /api/admin/products` - Get all products
- `POST /api/admin/products` - Create new product
- `PATCH /api/admin/products/[id]` - Update product
- `DELETE /api/admin/products/[id]` - Delete product

#### Order Management
- `GET /api/admin/orders` - Get all orders
- `PATCH /api/admin/orders/[id]` - Update order status

#### Category Management
- `GET /api/admin/categories` - Get all categories
- `POST /api/admin/categories` - Create category
- `PATCH /api/admin/categories/[id]` - Update category
- `DELETE /api/admin/categories/[id]` - Delete category

### Auth APIs
- `POST /api/auth/register` - Email/password signup (sends the verification email)
- `POST /api/auth/resend-verification` - Re-send the confirmation link (rate-limited)
- `GET /auth/confirm?token=…` - Email-confirmation callback
- `/api/auth/*` - Auth.js handlers (sign-in, callback, session, csrf, …)

### Webhook APIs
- `POST /api/webhooks/razorpay` - Razorpay payment webhooks
- `POST /api/webhooks/stripe` - Stripe payment webhooks

## 🔐 Authentication & Security

### Auth.js (NextAuth v5) Integration
- Email + password login (Credentials provider, bcrypt hashing)
- **Signup email verification** — unverified accounts cannot sign in until the
  emailed confirmation link is clicked (see [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md))
- JWT sessions in an httpOnly cookie — no session table in the DB
- Role-based access control (USER / ADMIN / SUPER_ADMIN)

### Security Features
- Protected API routes (`requireAuth` / `requireAdmin`)
- Verification tokens stored as SHA-256 hashes with a 24 h expiry
- Enumeration-safe, rate-limited resend endpoint
- Payment-webhook signature verification
- Secure admin access

## 📱 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on every push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

### Environment Variables for Production

#### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB connection string |
| `AUTH_SECRET` | Signs/encrypts the session JWT (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Application URL — baked into emailed verification links |
| `SMTP_HOST` | SMTP server for verification emails (`smtp.resend.com`) |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | SMTP username (`resend` for Resend) |
| `SMTP_PASS` | SMTP password (Resend API key) |
| `EMAIL_FROM` | From header — must be on the verified sending domain |

#### Optional Variables

| Variable | Description | Used For |
|----------|-------------|----------|
| `AUTH_URL` | Auth.js base URL (auto-inferred on Vercel) | Non-Vercel hosts |
| `STRIPE_SECRET_KEY` | Stripe secret key | Stripe payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature | Stripe webhooks |
| `RAZORPAY_KEY_ID` | Razorpay key ID | Razorpay payments |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | Razorpay payments |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature | Razorpay webhooks |

## 🧪 Testing

### Webhook Testing
1. Install ngrok: `npm install -g ngrok`
2. Start local server: `npm run dev`
3. Expose via ngrok: `npm run ngrok`
4. Use the ngrok URL in the Razorpay/Stripe webhook settings

### Local Testing
- Use `http://localhost:3001` for development
- Admin dashboard: `http://localhost:3001/admin`
- Signup verification links print to the `next dev` console when SMTP is unset

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@saakie-byknk.com or create an issue in the repository.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Auth.js](https://authjs.dev/) for authentication
- [Resend](https://resend.com/) for email delivery
- [Prisma](https://prisma.io/) for the database ORM
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Radix UI](https://radix-ui.com/) for accessible UI components
- [MongoDB](https://mongodb.com/) for the database
- [Vercel](https://vercel.com/) for deployment platform

## 🎯 Current Status

- ✅ Complete admin dashboard implementation
- ✅ User management with role-based access
- ✅ Product management with inventory tracking
- ✅ **Product Creation Form** - Complete add product modal with validation
- ✅ Order management with status workflow
- ✅ Category management with hierarchy
- ✅ Payment webhook integration (Razorpay, Stripe)
- ✅ Authentication and authorization (Auth.js credentials + JWT sessions)
- ✅ **Signup email verification** — confirmation links over SMTP/Resend
- ✅ Database schema with all relationships (User fields updated)
- ✅ API architecture with full CRUD operations
- ✅ Responsive UI with Tailwind CSS
- ✅ Build process optimization
- ✅ Schema-aligned product creation with dimensions support

---

**Built with ❤️ by Akshay Chavhan**
