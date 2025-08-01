import { Header } from '@/components/layout/header'
import { HeroSection } from '@/components/home/hero-section'
import { PromotionalBanner } from '@/components/home/promotional-banner'
import { CategoryGrid } from '@/components/home/category-grid'
import { FeaturedProducts } from '@/components/home/featured-products'
import { Newsletter } from '@/components/home/newsletter'
import { Footer } from '@/components/layout/footer'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <PromotionalBanner />
        <CategoryGrid />
        <FeaturedProducts />
        <Newsletter />
      </main>
      <Footer />
    </div>
  )
}