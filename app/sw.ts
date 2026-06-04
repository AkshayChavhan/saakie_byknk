/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import {
  Serwist,
  NetworkFirst,
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  CacheableResponsePlugin,
} from 'serwist'

// Serwist injects the precache manifest as __SW_MANIFEST at build time.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const OFFLINE_URL = '/offline'

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // ── CORRECTNESS-CRITICAL ──────────────────────────────────────────────
    // Never cache the API. Cart, orders, checkout, payments (Razorpay/Stripe),
    // webhooks and auth must always hit the network — serving a stale cart,
    // order status or session would be a data-integrity / security defect.
    // This rule is FIRST so nothing below (incl. defaultCache) can shadow it.
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },

    // Cloudinary product imagery: immutable per URL → CacheFirst, capped.
    {
      matcher: ({ url }) => url.hostname === 'res.cloudinary.com',
      handler: new CacheFirst({
        cacheName: 'cloudinary-images',
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }), // 30d
        ],
      }),
    },

    // Next.js optimized images + any other image request.
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith('/_next/image') || request.destination === 'image',
      handler: new StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 })], // 7d
      }),
    },

    // Hashed/immutable Next build chunks: CacheFirst.
    {
      matcher: ({ url }) => url.pathname.startsWith('/_next/static'),
      handler: new CacheFirst({
        cacheName: 'next-static',
        plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 365 })], // 1y
      }),
    },

    // Page navigations: fresh-when-online, fall back to cache, then offline page.
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: 'pages',
        networkTimeoutSeconds: 5,
        plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 })], // 1d
      }),
    },

    // Everything else: Serwist's tuned defaults for a Next.js app.
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()
