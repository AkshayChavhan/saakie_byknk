import Link from 'next/link'

// Branded 404 shown for unmatched routes (and anywhere notFound() is called).
// Mirrors the storefront's empty-state pattern: neutral full-height shell,
// Playfair serif heading, rose pill CTAs (matching app/about & app/contact).
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-rose-600 font-semibold tracking-wide mb-2">404</p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Page not found
        </h1>
        <p className="text-gray-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-3 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-lg active:scale-[0.98]"
          >
            Back to Home
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-medium rounded-full border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-all"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  )
}
