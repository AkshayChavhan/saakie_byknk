import { describe, it, expect } from 'vitest'
import { isPrivateNavigation, isSessionOrPaymentHost } from '@/lib/sw-rules'

describe('isSessionOrPaymentHost', () => {
  it('matches Clerk and the payment gateways', () => {
    for (const host of [
      'clerk.com',
      'api.clerk.com',
      'img.clerk.com',
      'saakie.clerk.accounts.dev',
      'checkout.razorpay.com',
      'api.razorpay.com',
      'js.stripe.com',
    ]) {
      expect(isSessionOrPaymentHost(host), host).toBe(true)
    }
  })

  it('leaves image CDNs and the site itself cacheable', () => {
    for (const host of ['res.cloudinary.com', 'images.unsplash.com', 'saakie.vercel.app', 'fonts.gstatic.com']) {
      expect(isSessionOrPaymentHost(host), host).toBe(false)
    }
  })
})

describe('isPrivateNavigation', () => {
  it('treats account, cart, checkout, admin, wishlist and auth pages as private', () => {
    for (const path of ['/account', '/account/orders', '/cart', '/checkout', '/checkout/confirmation/1', '/admin', '/admin/users', '/wishlist', '/sign-in', '/sign-up/verify']) {
      expect(isPrivateNavigation(path), path).toBe(true)
    }
  })

  it('lets public pages be cached for offline use', () => {
    for (const path of ['/', '/products', '/products/silk-saree', '/categories/silk', '/about', '/offline', '/carts']) {
      expect(isPrivateNavigation(path), path).toBe(false)
    }
  })
})
