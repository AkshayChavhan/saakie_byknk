# API Flow Documentation

Complete documentation of all API flows, request/response formats, and data flows for the Saree Shop backend.

## Table of Contents
1. [Authentication Flow](#authentication-flow)
2. [Product Browsing Flow](#product-browsing-flow)
3. [Cart Operations Flow](#cart-operations-flow)
4. [Checkout & Payment Flow](#checkout--payment-flow)
5. [Order Management Flow](#order-management-flow)
6. [Admin Operations Flow](#admin-operations-flow)
7. [Webhook Flows](#webhook-flows)
8. [API Endpoints Reference](#api-endpoints-reference)

---

## Authentication Flow

### Sequence Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │    Clerk    │     │   Backend   │     │   MongoDB   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  1. User Login    │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │  2. JWT Token     │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
       │  3. API Request   │                   │                   │
       │   (Bearer Token)  │                   │                   │
       │───────────────────────────────────────>                   │
       │                   │                   │                   │
       │                   │  4. Verify Token  │                   │
       │                   │<──────────────────│                   │
       │                   │                   │                   │
       │                   │  5. Token Valid   │                   │
       │                   │──────────────────>│                   │
       │                   │                   │                   │
       │                   │                   │  6. Query User   │
       │                   │                   │──────────────────>│
       │                   │                   │                   │
       │                   │                   │  7. User Data    │
       │                   │                   │<──────────────────│
       │                   │                   │                   │
       │  8. Response      │                   │                   │
       │<──────────────────────────────────────│                   │
       │                   │                   │                   │
```

### Request Format

```http
GET /api/cart HTTP/1.1
Host: api.saree-shop.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Middleware Implementation

```typescript
// 1. Extract token from header
const token = req.headers.authorization?.replace('Bearer ', '');

// 2. Verify with Clerk
const session = await clerkClient.verifyToken(token);

// 3. Get user from database
const user = await prisma.user.findUnique({
  where: { clerkId: session.sub }
});

// 4. Attach to request
req.user = user;
req.userId = session.sub;
```

### User Roles

| Role | Access Level |
|------|--------------|
| `USER` | Standard customer access |
| `ADMIN` | Admin dashboard + user management |
| `SUPER_ADMIN` | Full access including user deletion |

---

## Product Browsing Flow

### Sequence Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │   Backend   │     │   MongoDB   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ GET /api/products │                   │
       │ ?category=sarees  │                   │
       │ &minPrice=1000    │                   │
       │ &maxPrice=5000    │                   │
       │ &sort=price-low   │                   │
       │ &page=1&limit=12  │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │  Query with       │
       │                   │  filters, sort,   │
       │                   │  pagination       │
       │                   │──────────────────>│
       │                   │                   │
       │                   │  Products array   │
       │                   │<──────────────────│
       │                   │                   │
       │ {                 │                   │
       │   products: [...],│                   │
       │   pagination: {   │                   │
       │     page: 1,      │                   │
       │     totalPages: 5 │                   │
       │   }               │                   │
       │ }                 │                   │
       │<──────────────────│                   │
```

### Query Parameters

```typescript
interface ProductQueryParams {
  category?: string;      // Category slug
  minPrice?: number;      // Minimum price filter
  maxPrice?: number;      // Maximum price filter
  sort?: 'newest' | 'price-low' | 'price-high' | 'popular';
  inStock?: 'true' | 'false';
  page?: number;          // Default: 1
  limit?: number;         // Default: 12, Max: 50
}
```

### Example Request

```http
GET /api/products?category=silk-sarees&minPrice=2000&maxPrice=10000&sort=price-low&page=1&limit=12
```

### Response Format

```json
{
  "success": true,
  "products": [
    {
      "id": "prod_123",
      "name": "Banarasi Silk Saree",
      "slug": "banarasi-silk-saree",
      "price": 4500,
      "comparePrice": 5500,
      "rating": 4.5,
      "reviewCount": 28,
      "image": "https://cloudinary.com/...",
      "colors": ["Red", "Blue", "Green"],
      "category": "Silk Sarees",
      "stock": 15,
      "isNew": true,
      "isBestseller": false,
      "inStock": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalCount": 156,
    "totalPages": 13,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Cart Operations Flow

### Sequence Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │   Backend   │     │   MongoDB   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ POST /api/cart    │                   │
       │ {                 │                   │
       │   productId: "x", │                   │
       │   quantity: 2,    │                   │
       │   colorId: "c",   │                   │
       │   sizeId: "s"     │                   │
       │ }                 │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 1. Find/Create    │
       │                   │    Cart           │
       │                   │──────────────────>│
       │                   │                   │
       │                   │ 2. Validate       │
       │                   │    Product Stock  │
       │                   │──────────────────>│
       │                   │                   │
       │                   │ 3. Add/Update     │
       │                   │    Cart Item      │
       │                   │──────────────────>│
       │                   │                   │
       │                   │ 4. Calculate      │
       │                   │    Totals         │
       │                   │<──────────────────│
       │                   │                   │
       │ {                 │                   │
       │   cart: {...},    │                   │
       │   subtotal: 4000, │                   │
       │   itemCount: 2    │                   │
       │ }                 │                   │
       │<──────────────────│                   │
```

### Add to Cart Request

```typescript
interface AddToCartRequest {
  productId: string;
  quantity: number;
  colorId?: string;   // Optional variant
  sizeId?: string;    // Optional variant
}
```

### Cart Response

```typescript
interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CartItem {
  id: string;
  productId: string;
  product: {
    name: string;
    slug: string;
    price: number;
    image: string;
  };
  quantity: number;
  color?: { name: string; hexCode: string };
  size?: { name: string };
  itemTotal: number;
}
```

### Example Response

```json
{
  "success": true,
  "cart": {
    "id": "cart_123",
    "userId": "user_456",
    "items": [
      {
        "id": "item_789",
        "productId": "prod_abc",
        "product": {
          "name": "Banarasi Silk Saree",
          "slug": "banarasi-silk-saree",
          "price": 4500,
          "image": "https://..."
        },
        "quantity": 2,
        "color": { "name": "Red", "hexCode": "#FF0000" },
        "size": { "name": "Free Size" },
        "itemTotal": 9000
      }
    ]
  },
  "subtotal": 9000,
  "itemCount": 2
}
```

---

## Checkout & Payment Flow

### Sequence Diagram

```
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│Frontend│   │Backend │   │Stripe/ │   │MongoDB │   │Webhooks│
│        │   │        │   │Razorpay│   │        │   │        │
└───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘
    │            │            │            │            │
    │ 1. Create Payment Intent            │            │
    │ POST /api/payments/create-intent    │            │
    │ {gateway: "stripe", addressId: "x"} │            │
    │───────────>│            │            │            │
    │            │            │            │            │
    │            │ 2. Create Order (PENDING)           │
    │            │────────────────────────>│            │
    │            │            │            │            │
    │            │ 3. Create Payment Intent│            │
    │            │───────────>│            │            │
    │            │            │            │            │
    │            │ 4. Return client_secret│            │
    │            │<───────────│            │            │
    │            │            │            │            │
    │ 5. {orderId, clientSecret}          │            │
    │<───────────│            │            │            │
    │            │            │            │            │
    │ 6. Confirm payment (Stripe.js)      │            │
    │───────────────────────>│            │            │
    │            │            │            │            │
    │            │            │ 7. Payment Success     │
    │            │            │────────────────────────>│
    │            │            │            │            │
    │            │            │            │ 8. Webhook │
    │            │            │            │   Event    │
    │            │<───────────────────────────────────│
    │            │            │            │            │
    │            │ 9. Update Order to PAID │            │
    │            │────────────────────────>│            │
    │            │            │            │            │
```

### Create Payment Intent Request

```typescript
interface CreatePaymentIntentRequest {
  paymentGateway: 'stripe' | 'razorpay';
  shippingAddressId: string;
  billingAddressId?: string;  // Optional, defaults to shipping
}
```

### Payment Intent Response

```json
{
  "success": true,
  "order": {
    "id": "order_123",
    "orderNumber": "ORD-2024-00001",
    "total": 5000,
    "status": "PENDING",
    "paymentStatus": "PENDING"
  },
  "clientSecret": "pi_xxx_secret_xxx",  // For Stripe
  "razorpayOrderId": "order_xxx",        // For Razorpay
  "gateway": "stripe"
}
```

### Payment Status Flow

```
PENDING ──┬── PAID ──── (success)
          │
          ├── FAILED ── (payment declined)
          │
          └── CANCELLED (user cancelled)
```

### Frontend Payment Confirmation

**Stripe:**
```javascript
const { error } = await stripe.confirmPayment({
  elements,
  clientSecret,
  confirmParams: {
    return_url: `${window.location.origin}/order-confirmation`,
  },
});
```

**Razorpay:**
```javascript
const options = {
  key: RAZORPAY_KEY_ID,
  order_id: razorpayOrderId,
  handler: function (response) {
    // Verify payment on backend
  }
};
const rzp = new Razorpay(options);
rzp.open();
```

---

## Order Management Flow

### Order Status Flow

```
PENDING ──> CONFIRMED ──> PROCESSING ──> SHIPPED ──> OUT_FOR_DELIVERY ──> DELIVERED
    │
    ├──> CANCELLED (before shipping)
    │
    └──> RETURNED ──> REFUNDED (after delivery)
```

### Order Response Format

```json
{
  "success": true,
  "order": {
    "id": "order_123",
    "orderNumber": "ORD-2024-00001",
    "status": "SHIPPED",
    "paymentStatus": "PAID",
    "total": 5000,
    "subtotal": 4500,
    "shippingCost": 500,
    "discount": 0,
    "items": [
      {
        "id": "item_123",
        "product": {
          "name": "Banarasi Silk Saree",
          "image": "https://..."
        },
        "quantity": 1,
        "price": 4500,
        "color": "Red",
        "size": "Free Size"
      }
    ],
    "shippingAddress": {
      "name": "John Doe",
      "line1": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-16T14:20:00Z"
  }
}
```

---

## Admin Operations Flow

### Sequence Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Admin Panel │     │   Backend   │     │   MongoDB   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Auth Check     │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 2. Verify Token   │
       │                   │    + Check Role   │
       │                   │──────────────────>│
       │                   │                   │
       │                   │ 3. User with      │
       │                   │    ADMIN role     │
       │                   │<──────────────────│
       │                   │                   │
       │ 4. GET /api/admin/dashboard          │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ 5. Aggregate      │
       │                   │    Statistics     │
       │                   │──────────────────>│
       │                   │                   │
       │ 6. Dashboard Data │                   │
       │<──────────────────│                   │
```

### Dashboard Response

```json
{
  "success": true,
  "stats": {
    "totalUsers": 1250,
    "totalOrders": 3500,
    "totalProducts": 450,
    "totalRevenue": 15000000,
    "monthlyRevenue": 1200000,
    "pendingOrders": 45,
    "activeUsers": 320,
    "lowStockProducts": 12
  },
  "topProducts": [
    {
      "id": "prod_123",
      "name": "Banarasi Silk Saree",
      "sales": 156,
      "revenue": 702000
    }
  ],
  "recentOrders": [
    {
      "id": "order_123",
      "orderNumber": "ORD-2024-00001",
      "total": 5000,
      "status": "PENDING",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Webhook Flows

### Clerk User Webhook

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Clerk  │     │   Backend   │     │    Svix     │     │   MongoDB   │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
     │                 │                   │                   │
     │ user.created    │                   │                   │
     │ POST /webhooks/clerk               │                   │
     │ Headers: svix-id, svix-timestamp,  │                   │
     │          svix-signature            │                   │
     │────────────────>│                   │                   │
     │                 │                   │                   │
     │                 │ Verify Signature  │                   │
     │                 │──────────────────>│                   │
     │                 │                   │                   │
     │                 │ Signature Valid   │                   │
     │                 │<──────────────────│                   │
     │                 │                   │                   │
     │                 │ Create User + Cart + Wishlist        │
     │                 │──────────────────────────────────────>│
     │                 │                   │                   │
     │ 200 OK          │                   │                   │
     │<────────────────│                   │                   │
```

**Clerk Webhook Events:**
| Event | Action |
|-------|--------|
| `user.created` | Create User, Cart, Wishlist |
| `user.updated` | Update User profile |
| `user.deleted` | Delete User and related data |

### Stripe Payment Webhook

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ Stripe  │     │   Backend   │     │   MongoDB   │
└────┬────┘     └──────┬──────┘     └──────┬──────┘
     │                 │                   │
     │ payment_intent.succeeded           │
     │ POST /webhooks/stripe              │
     │ stripe-signature: xxx              │
     │────────────────>│                   │
     │                 │                   │
     │                 │ Verify Signature  │
     │                 │ (stripe.webhooks  │
     │                 │  .constructEvent) │
     │                 │                   │
     │                 │ Update Order      │
     │                 │ status: PAID      │
     │                 │ paymentStatus:PAID│
     │                 │──────────────────>│
     │                 │                   │
     │                 │ Clear Cart        │
     │                 │──────────────────>│
     │                 │                   │
     │ 200 OK          │                   │
     │<────────────────│                   │
```

**Stripe Webhook Events:**
| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Order PAID, Clear Cart |
| `payment_intent.payment_failed` | Order FAILED |
| `payment_intent.canceled` | Order CANCELLED |

---

## API Endpoints Reference

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products with filters |
| GET | `/api/products/:slug` | Get single product details |
| GET | `/api/products/featured` | Get featured products |
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/:slug` | Get category with products |
| GET | `/health` | Health check endpoint |

### Protected Endpoints (User Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get user's cart |
| POST | `/api/cart` | Add item to cart |
| PATCH | `/api/cart/items/:itemId` | Update item quantity |
| DELETE | `/api/cart/items/:itemId` | Remove item from cart |
| DELETE | `/api/cart` | Clear entire cart |
| GET | `/api/orders` | List user's orders |
| GET | `/api/orders/:id` | Get order details |
| POST | `/api/payments/create-intent` | Create payment intent |
| POST | `/api/payments/confirm` | Confirm payment |
| GET | `/api/wishlist` | Get user's wishlist |
| POST | `/api/wishlist` | Add item to wishlist |
| DELETE | `/api/wishlist/:id` | Remove from wishlist |
| GET | `/api/auth/check-role` | Check user role |

### Admin Endpoints (Admin Role Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard statistics |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id` | Update user role |
| DELETE | `/api/admin/users/:id` | Delete user (SUPER_ADMIN) |
| GET | `/api/admin/products` | List all products |
| POST | `/api/admin/products` | Create product |
| PATCH | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Delete product |
| GET | `/api/admin/orders` | List all orders |
| PATCH | `/api/admin/orders/:id` | Update order status |
| GET | `/api/admin/categories` | List categories |
| POST | `/api/admin/categories` | Create category |
| PATCH | `/api/admin/categories/:id` | Update category |
| DELETE | `/api/admin/categories/:id` | Delete category |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/clerk` | Clerk user events |
| POST | `/api/webhooks/stripe` | Stripe payment events |
| POST | `/api/webhooks/razorpay` | Razorpay payment events |

---

## Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}  // Optional additional info
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 500 | Server Error | Unexpected error |
