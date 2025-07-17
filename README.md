# SareeShop - Premium Saree E-commerce Platform

A modern, mobile-first e-commerce platform for selling sarees online, built with Next.js 14, TypeScript, Prisma, MongoDB, and Clerk authentication.

## Features

### User Features
- 🔐 **Authentication**: Secure user authentication with Clerk
- 📱 **Mobile Responsive**: Optimized for mobile devices with a Flipkart-level UI
- 🛍️ **Product Catalog**: Browse sarees by categories, colors, fabrics, occasions
- 🔍 **Advanced Search**: Search and filter products by multiple criteria
- ❤️ **Wishlist**: Save favorite products for later
- 🛒 **Shopping Cart**: Add products to cart with quantity management
- 📦 **Order Management**: Track orders from placement to delivery
- ⭐ **Reviews & Ratings**: Rate and review purchased products
- 📍 **Address Management**: Multiple shipping addresses support

### Admin Features
- 👨‍💼 **Admin Dashboard**: Comprehensive admin panel for managing the store
- 📊 **Analytics**: Sales reports and performance metrics
- 🏷️ **Product Management**: Add, edit, and manage product catalog
- 📋 **Category Management**: Organize products into categories
- 📦 **Order Management**: Process and track customer orders
- 👥 **User Management**: Manage customer accounts and roles

### Technical Features
- ⚡ **Performance**: Optimized with Next.js 14 App Router
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- 🔒 **Type Safety**: Full TypeScript implementation
- 📊 **Database**: MongoDB with Prisma ORM
- 🔄 **State Management**: React Query for server state
- 📱 **PWA Ready**: Progressive Web App capabilities
- 🔍 **SEO Optimized**: Server-side rendering and meta tags

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB
- **ORM**: Prisma
- **Authentication**: Clerk
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- MongoDB database (local or cloud)
- Clerk account for authentication

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/saree-shop.git
cd saree-shop
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Database
DATABASE_URL="mongodb://localhost:27017/saree-shop"

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
saree-shop/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication pages
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── cart/              # Shopping cart pages
│   ├── categories/        # Category pages
│   ├── products/          # Product pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── auth/             # Authentication components
│   ├── cart/             # Cart components
│   ├── home/             # Home page components
│   ├── layout/           # Layout components
│   ├── products/         # Product components
│   └── ui/               # UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── db.ts            # Database connection
│   └── utils.ts         # Utility functions
├── prisma/              # Prisma schema and migrations
├── public/              # Static assets
└── types/               # TypeScript type definitions
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on every push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `DATABASE_URL` | MongoDB connection string | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@sareeshop.com or join our Discord channel.

## Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Clerk](https://clerk.com/) for authentication
- [Prisma](https://prisma.io/) for the database ORM
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Radix UI](https://radix-ui.com/) for accessible UI components# saakie_byknk
