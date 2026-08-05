import type { MetadataRoute } from 'next'

// Web App Manifest, served by Next.js at /manifest.webmanifest. Makes the
// storefront installable to the home screen / desktop with an app-like,
// full-screen (standalone) experience. The dark theme/background match the
// brand logo tile (see scripts/generate-icons.py) so the splash screen and OS
// task-switcher chrome stay on-brand.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Saakie_byknk — Premium Fashion',
    short_name: 'Saakie',
    description:
      'Shop the finest collection of premium fashion and sarees online. Authentic designs, fast delivery across India.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#161616',
    categories: ['shopping', 'lifestyle'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Shop all products',
        short_name: 'Shop',
        url: '/products',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'View cart',
        short_name: 'Cart',
        url: '/cart',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'My wishlist',
        short_name: 'Wishlist',
        url: '/wishlist',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
