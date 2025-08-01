# Saakie_byknk - Premium Fashion E-commerce Platform

A modern, mobile-first e-commerce platform for fashion retail, built with Next.js 14, TypeScript, Prisma, MongoDB, and Clerk authentication. Features a comprehensive admin dashboard with full CRUD operations and real-time webhook monitoring.

## ✨ Features

### 🛍️ User Experience
- 🔐 **Secure Authentication**: Clerk integration with profile management
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
- 🎯 **Clerk Webhooks**: Automatic user lifecycle management
- 📲 **Real-time Sync**: Profile data synchronization
- 🔍 **Webhook Debugging**: Live webhook monitoring interface
- 💾 **Data Persistence**: Automatic cart and wishlist creation

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
- **Authentication**: Clerk
- **Webhook Processing**: Svix
- **API**: RESTful API with Next.js API Routes

### DevOps & Tools
- **Deployment**: Vercel (recommended)
- **Environment**: Node.js 18+
- **Package Manager**: npm
- **Build Process**: Optimized with Prisma generation

## 📋 Prerequisites

- Node.js 18.x or later
- npm or yarn
- MongoDB database (local or MongoDB Atlas)
- Clerk account for authentication
- Ngrok (optional, for webhook testing)

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

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_clerk_webhook_secret

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

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
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── sign-in/       # Sign in page
│   │   └── sign-up/       # Sign up page
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
│   │   ├── cart/          # Shopping cart API
│   │   ├── categories/    # Category API
│   │   ├── orders/        # Order API
│   │   ├── products/      # Product API
│   │   ├── users/         # User API
│   │   └── webhooks/      # Webhook endpoints
│   │       └── clerk/     # Clerk user webhooks
│   ├── cart/              # Shopping cart pages
│   ├── categories/        # Category browsing pages
│   ├── products/          # Product detail pages
│   ├── webhook-logs/      # Webhook monitoring page
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
│   ├── db.ts            # Database connection
│   ├── users.ts         # User management utilities
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
  clerkId           String   @unique
  email             String   @unique
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

### Webhook APIs
- `POST /api/webhooks/clerk` - Clerk user webhooks
- `GET /api/webhook-logs` - Get webhook logs
- `POST /api/webhook-logs` - Store webhook logs

## 🔐 Authentication & Security

### Clerk Integration
- Secure user authentication
- Profile management
- Role-based access control
- Webhook-based user lifecycle management

### Security Features
- Protected API routes
- Role-based permissions
- Webhook signature verification
- Secure admin access

## 🌐 Webhook Integration

### Clerk Webhooks
- **User Creation**: Automatic user record creation
- **User Updates**: Profile synchronization
- **User Deletion**: Cleanup of related data
- **Real-time Monitoring**: Live webhook tracking at `/webhook-logs`

### Webhook Security
- SVix signature verification
- Error handling and logging
- Retry mechanisms
- Status monitoring

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
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret |
| `NEXT_PUBLIC_APP_URL` | Application URL |

#### Optional Variables

| Variable | Description | Used For |
|----------|-------------|----------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in page URL (default: /sign-in) | Custom auth flows |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up page URL (default: /sign-up) | Custom auth flows |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Redirect after sign-in (default: /) | Post-auth redirects |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Redirect after sign-up (default: /) | Post-auth redirects |
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
4. Use ngrok URL in Clerk webhook settings

### Local Testing
- Use `http://localhost:3001` for development
- Admin dashboard: `http://localhost:3001/admin`
- Webhook monitoring: `http://localhost:3001/webhook-logs`

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
- [Clerk](https://clerk.com/) for authentication
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
- ✅ Webhook integration with Clerk
- ✅ Real-time webhook monitoring
- ✅ Authentication and authorization
- ✅ Database schema with all relationships (User fields updated)
- ✅ API architecture with full CRUD operations
- ✅ Responsive UI with Tailwind CSS
- ✅ Build process optimization
- ✅ Schema-aligned product creation with dimensions support

---

**Built with ❤️ by Akshay Chavhan**
