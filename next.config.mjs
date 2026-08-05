import withSerwistInit from '@serwist/next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// @serwist/next v9 is ESM-only, which is why this config is `.mjs` (ESM) rather
// than the previous CommonJS `next.config.js`. Serwist compiles the service
// worker source (app/sw.ts) into public/sw.js at build time, injecting the
// precache manifest. It is disabled in development to avoid stale-cache pain
// while iterating — the SW only activates in `next build` + `next start`.
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Hosts allowed through the Next.js image optimizer. `images.pexels.com`
    // is required for the royalty-free demo saree photos (see scripts/
    // seed-sample-sarees.mjs); without it the optimizer blocks them and every
    // product image renders broken.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'saakie.vercel.app' },
    ],
    // Allow SVG sources (e.g. /images/placeholder-category.svg) through the
    // image optimizer. Hardened so a served SVG can never execute scripts:
    // it is sandboxed with a strict CSP and sent as an attachment.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  serverExternalPackages: ['@prisma/client'],
  // Pin the workspace root to this directory. A stray `package-lock.json` in
  // the home directory above the repo makes Next infer $HOME as the root
  // ("we detected multiple lockfiles"), which warns on every `next dev` and
  // points file tracing at the whole home directory. Derived from the file URL
  // rather than `import.meta.dirname` because that needs Node >= 20.11 while
  // `engines` only asks for >= 20.0 — there it is silently `undefined` and the
  // bad inference quietly returns.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default withSerwist(nextConfig)
