import Link from 'next/link'
import Image from 'next/image'

const categories = [
  {
    id: 1,
    name: 'Silk Sarees',
    slug: 'silk-sarees',
    image: '/images/category-silk.jpg',
    count: 250,
  },
  {
    id: 2,
    name: 'Cotton Sarees',
    slug: 'cotton-sarees',
    image: '/images/category-cotton.jpg',
    count: 180,
  },
  {
    id: 3,
    name: 'Designer Sarees',
    slug: 'designer-sarees',
    image: '/images/category-designer.jpg',
    count: 120,
  },
  {
    id: 4,
    name: 'Banarasi Sarees',
    slug: 'banarasi-sarees',
    image: '/images/category-banarasi.jpg',
    count: 95,
  },
  {
    id: 5,
    name: 'Kanjivaram Sarees',
    slug: 'kanjivaram-sarees',
    image: '/images/category-kanjivaram.jpg',
    count: 110,
  },
  {
    id: 6,
    name: 'Georgette Sarees',
    slug: 'georgette-sarees',
    image: '/images/category-georgette.jpg',
    count: 140,
  },
]

export function CategoryGrid() {
  return (
    <section className="py-12 sm:py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            Shop by Category
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse through our curated collection of traditional and contemporary sarees
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
            >
              <div className="aspect-[3/4] relative bg-gray-200">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <h3 className="text-white font-semibold text-lg sm:text-xl mb-1">
                    {category.name}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {category.count} Products
                  </p>
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors z-5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}