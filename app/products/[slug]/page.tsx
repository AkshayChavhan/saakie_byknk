'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Heart, 
  ShoppingCart, 
  Star, 
  Plus, 
  Minus,
  Share2,
  ArrowLeft,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  QrCode,
  X,
  Copy,
  Check
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface ProductImage {
  id: string
  url: string
  alt: string | null
  isPrimary: boolean
}

interface Color {
  id: string
  name: string
  hexCode: string
}

interface Size {
  id: string
  name: string
}

interface Variant {
  id: string
  sku: string
  price: number | null
  stock: number
  image: string | null
  color: Color | null
  size: Size | null
}

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  images: string[]
  isVerified: boolean
  createdAt: string
  user: {
    name: string | null
    imageUrl: string | null
  }
}

interface RelatedProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number
  image: string
}

interface Product {
  id: string
  name: string
  slug: string
  description: string
  details: string | null
  price: number
  comparePrice: number | null
  stock: number
  brand: string | null
  material: string | null
  careInstructions: string | null
  occasion: string[]
  pattern: string | null
  fabric: string | null
  workType: string | null
  blouseIncluded: boolean
  weight: number | null
  images: ProductImage[]
  colors: Color[]
  sizes: Size[]
  variants: Variant[]
  category: {
    id: string
    name: string
    slug: string
  }
  reviews: Review[]
  rating: number
  reviewCount: number
  salesCount: number
  isNew: boolean
  isBestseller: boolean
  inStock: boolean
  relatedProducts: RelatedProduct[]
  dimensions?: {
    length: number
    width: number
    height: number
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'reviews'>('description')
  const [showFullDescription, setShowFullDescription] = useState(false)
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [paymentStep, setPaymentStep] = useState<'details' | 'qr' | 'success'>('details')
  const [copied, setCopied] = useState(false)
  const [orderId, setOrderId] = useState<string>('')
  
  // Order Form State
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  })

  useEffect(() => {
    fetchProduct()
  }, [slug])

  useEffect(() => {
    if (product?.colors.length && !selectedColor) {
      setSelectedColor(product.colors[0].id)
    }
    if (product?.sizes.length && !selectedSize) {
      setSelectedSize(product.sizes[0].id)
    }
  }, [product])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${slug}`)
      if (!response.ok) {
        throw new Error('Product not found')
      }
      const data = await response.json()
      setProduct(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    console.log('Add to cart:', {
      productId: product?.id,
      selectedColor,
      selectedSize,
      quantity
    })
    // TODO: Implement cart functionality
  }

  const handleCashOnDelivery = () => {
    if (!product) return
    
    const orderData = {
      productId: product.id,
      productName: product.name,
      productImage: product.images[0]?.url || '/images/placeholder-product.jpg',
      selectedColor: product.colors.find(c => c.id === selectedColor)?.name || 'Default',
      selectedSize: product.sizes.find(s => s.id === selectedSize)?.name || 'Free Size',
      quantity,
      price: product.price,
      total: product.price * quantity
    }
    
    setOrderDetails(orderData)
    setShowPaymentModal(true)
    setPaymentStep('details')
  }

  const handlePlaceOrder = async () => {
    try {
      const orderPayload = {
        ...orderDetails,
        ...customerInfo,
        paymentMethod: 'COD'
      }

      console.log('Placing order:', orderPayload)
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place order')
      }

      const result = await response.json()
      console.log('Order placed successfully:', result)
      
      // Store the order ID from the response
      setOrderId(result.order?.orderNumber || `COD${Date.now()}`)
      setPaymentStep('qr')
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Failed to place order. Please try again.')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const discount = (price: number, comparePrice: number) => {
    return Math.round(((comparePrice - price) / comparePrice) * 100)
  }

  const nextImage = () => {
    if (product?.images) {
      setSelectedImageIndex((prev) => 
        prev === product.images.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevImage = () => {
    if (product?.images) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? product.images.length - 1 : prev - 1
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Link 
            href="/products"
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90"
          >
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/products" className="p-2 -ml-2">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-medium text-gray-900 truncate mx-4">
            {product.name}
          </h1>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsWishlisted(!isWishlisted)}
              className="p-2"
            >
              <Heart 
                size={24} 
                className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}
              />
            </button>
            <button className="p-2">
              <Share2 size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 lg:py-8">
        {/* Desktop Breadcrumb */}
        <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={16} />
          <Link href="/products" className="hover:text-primary">Products</Link>
          <ChevronRight size={16} />
          <Link href={`/categories/${product.category.slug}`} className="hover:text-primary">
            {product.category.name}
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
              {product.images.length > 0 ? (
                <Image
                  src={product.images[selectedImageIndex]?.url || '/images/placeholder-product.jpg'}
                  alt={product.images[selectedImageIndex]?.alt || product.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No Image Available
                </div>
              )}

              {/* Image Navigation */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 space-y-2">
                {product.isNew && (
                  <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                    NEW
                  </span>
                )}
                {product.isBestseller && (
                  <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                    BESTSELLER
                  </span>
                )}
                {product.comparePrice && product.comparePrice > product.price && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {discount(product.price, product.comparePrice)}% OFF
                  </span>
                )}
              </div>

              {/* Stock Status */}
              {!product.inStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-medium text-lg">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-16 h-16 lg:w-20 lg:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index ? 'border-primary' : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || product.name}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={`${
                        i < Math.floor(product.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {product.rating} ({product.reviewCount} reviews)
                  </span>
                </div>
                
                {product.salesCount > 0 && (
                  <span className="text-sm text-gray-500">
                    {product.salesCount} sold
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <span className="text-sm text-gray-600">Category:</span>
                <Link 
                  href={`/categories/${product.category.slug}`}
                  className="text-primary hover:text-primary/80 text-sm"
                >
                  {product.category.name}
                </Link>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <span className="text-xl text-gray-500 line-through">
                    {formatPrice(product.comparePrice)}
                  </span>
                )}
              </div>
              {product.comparePrice && product.comparePrice > product.price && (
                <div className="text-green-600 text-sm font-medium">
                  You save {formatPrice(product.comparePrice - product.price)} ({discount(product.price, product.comparePrice)}% off)
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${product.inStock ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                {product.inStock ? `In Stock (${product.stock} available)` : 'Out of Stock'}
              </span>
            </div>

            {/* Description Preview */}
            <div className="space-y-2">
              <p className="text-gray-700 leading-relaxed">
                {showFullDescription 
                  ? product.description 
                  : `${product.description.slice(0, 150)}${product.description.length > 150 ? '...' : ''}`
                }
              </p>
              {product.description.length > 150 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  {showFullDescription ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>

            {/* Color Selection */}
            {product.colors.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Color</h3>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`relative w-12 h-12 rounded-full border-2 ${
                        selectedColor === color.id ? 'border-primary' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.hexCode }}
                      title={color.name}
                    >
                      {selectedColor === color.id && (
                        <div className="absolute inset-0 rounded-full border-2 border-white shadow-inner"></div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedColor && (
                  <span className="text-sm text-gray-600">
                    Selected: {product.colors.find(c => c.id === selectedColor)?.name}
                  </span>
                )}
              </div>
            )}

            {/* Size Selection */}
            {product.sizes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                        selectedSize === size.id
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selection */}
            {product.inStock && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Quantity</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-50"
                      disabled={quantity <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-4 py-2 font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="p-2 hover:bg-gray-50"
                      disabled={quantity >= product.stock}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    {product.stock} available
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {product.inStock ? (
                <>
                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-primary text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart size={20} />
                    <span>Add to Cart - {formatPrice(product.price * quantity)}</span>
                  </button>
                  
                  <button
                    onClick={handleCashOnDelivery}
                    className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <CreditCard size={20} />
                    <span>Cash on Delivery - {formatPrice(product.price * quantity)}</span>
                  </button>
                </>
              ) : (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 py-4 px-6 rounded-lg font-medium text-lg cursor-not-allowed"
                >
                  Out of Stock
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 border rounded-lg font-medium transition-colors ${
                    isWishlisted
                      ? 'border-red-500 text-red-500 bg-red-50'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Heart size={18} className={isWishlisted ? 'fill-current' : ''} />
                  <span>{isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}</span>
                </button>

                <button className="flex items-center justify-center space-x-2 py-3 px-4 border border-gray-300 text-gray-700 hover:border-gray-400 rounded-lg font-medium transition-colors">
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="text-center">
                <Truck className="mx-auto mb-2 text-primary" size={24} />
                <p className="text-xs text-gray-600">Free Shipping</p>
              </div>
              <div className="text-center">
                <RotateCcw className="mx-auto mb-2 text-primary" size={24} />
                <p className="text-xs text-gray-600">Easy Returns</p>
              </div>
              <div className="text-center">
                <Shield className="mx-auto mb-2 text-primary" size={24} />
                <p className="text-xs text-gray-600">Secure Payment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-12">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {['description', 'details', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab} {tab === 'reviews' && `(${product.reviewCount})`}
                </button>
              ))}
            </nav>
          </div>

          <div className="py-8">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  {product.description}
                </p>
                {product.details && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">Additional Details</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {product.details}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Product Information</h3>
                  <dl className="space-y-3">
                    {product.brand && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Brand:</dt>
                        <dd className="font-medium">{product.brand}</dd>
                      </div>
                    )}
                    {product.material && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Material:</dt>
                        <dd className="font-medium">{product.material}</dd>
                      </div>
                    )}
                    {product.fabric && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Fabric:</dt>
                        <dd className="font-medium">{product.fabric}</dd>
                      </div>
                    )}
                    {product.pattern && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Pattern:</dt>
                        <dd className="font-medium">{product.pattern}</dd>
                      </div>
                    )}
                    {product.workType && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Work Type:</dt>
                        <dd className="font-medium">{product.workType}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Blouse Included:</dt>
                      <dd className="font-medium">{product.blouseIncluded ? 'Yes' : 'No'}</dd>
                    </div>
                    {product.weight && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Weight:</dt>
                        <dd className="font-medium">{product.weight}g</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Care Instructions</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-900 text-sm leading-relaxed">
                      {product.careInstructions || 'Hand wash with cold water. Do not bleach. Dry clean recommended for best results.'}
                    </p>
                  </div>

                  {product.occasion.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Perfect For</h4>
                      <div className="flex flex-wrap gap-2">
                        {product.occasion.map((occ, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {occ}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.dimensions && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Dimensions</h4>
                      <p className="text-gray-700 text-sm">
                        {product.dimensions.length}&quot; L × {product.dimensions.width}&quot; W × {product.dimensions.height}&quot; H
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {product.reviews.length > 0 ? (
                  <>
                    <div className="text-center py-6 border-b border-gray-200">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {product.rating}
                      </div>
                      <div className="flex items-center justify-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={20}
                            className={`${
                              i < Math.floor(product.rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-600">
                        Based on {product.reviewCount} reviews
                      </p>
                    </div>

                    <div className="space-y-6">
                      {product.reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-200 pb-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                              {review.user.imageUrl ? (
                                <Image
                                  src={review.user.imageUrl}
                                  alt={review.user.name || 'User'}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              ) : (
                                <span className="text-gray-600 font-medium">
                                  {review.user.name?.charAt(0) || 'U'}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {review.user.name || 'Anonymous'}
                                </span>
                                {review.isVerified && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                    Verified Purchase
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      size={14}
                                      className={`${
                                        i < review.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              
                              {review.title && (
                                <h4 className="font-medium text-gray-900 mb-2">
                                  {review.title}
                                </h4>
                              )}
                              
                              {review.comment && (
                                <p className="text-gray-700 mb-3">
                                  {review.comment}
                                </p>
                              )}
                              
                              {review.images.length > 0 && (
                                <div className="flex space-x-2">
                                  {review.images.map((imageUrl, index) => (
                                    <div
                                      key={index}
                                      className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden"
                                    >
                                      <Image
                                        src={imageUrl}
                                        alt={`Review image ${index + 1}`}
                                        width={64}
                                        height={64}
                                        className="object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No reviews yet</p>
                    <p className="text-sm text-gray-400">
                      Be the first to review this product
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {product.relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.slug}`}
                  className="group"
                >
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                    <Image
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      width={300}
                      height={300}
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="font-medium text-gray-900 line-clamp-2 text-sm mb-2">
                    {relatedProduct.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-gray-900">
                      {formatPrice(relatedProduct.price)}
                    </span>
                    {relatedProduct.comparePrice > relatedProduct.price && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(relatedProduct.comparePrice)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="flex space-x-2">
          <button
            onClick={() => setIsWishlisted(!isWishlisted)}
            className={`flex-shrink-0 p-3 border rounded-lg ${
              isWishlisted
                ? 'border-red-500 text-red-500 bg-red-50'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            <Heart size={20} className={isWishlisted ? 'fill-current' : ''} />
          </button>
          
          {product.inStock ? (
            <>
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
              >
                <ShoppingCart size={16} />
                <span>Cart</span>
              </button>
              
              <button
                onClick={handleCashOnDelivery}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
              >
                <CreditCard size={16} />
                <span>COD</span>
              </button>
            </>
          ) : (
            <button
              disabled
              className="flex-1 bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-medium cursor-not-allowed"
            >
              Out of Stock
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {paymentStep === 'details' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Product Summary */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={orderDetails?.productImage || '/images/placeholder-product.jpg'}
                        alt={orderDetails?.productName || 'Product'}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {orderDetails?.productName}
                      </h3>
                      <p className="text-sm text-gray-600 mb-1">
                        Color: {orderDetails?.selectedColor} | Size: {orderDetails?.selectedSize}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {orderDetails?.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatPrice(orderDetails?.total || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Information Form */}
                <div className="space-y-4 mb-6">
                  <h3 className="font-medium text-gray-900">Delivery Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <textarea
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter complete address"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={customerInfo.city}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="City"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        value={customerInfo.pincode}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, pincode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Pincode"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatPrice(orderDetails?.total || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Delivery:</span>
                    <span className="font-medium text-green-600">FREE</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total:</span>
                    <span>{formatPrice(orderDetails?.total || 0)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={!customerInfo.name || !customerInfo.phone || !customerInfo.address || !customerInfo.city || !customerInfo.pincode}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Place Order (Cash on Delivery)
                </button>
              </div>
            )}

            {paymentStep === 'qr' && (
              <div className="p-6 text-center">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Payment QR Code</h2>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-green-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-center mb-2">
                    <Check className="text-green-600 mr-2" size={20} />
                    <span className="text-green-800 font-medium">Order Placed Successfully!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Order ID: {orderId}
                  </p>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    Scan this QR code to make payment via UPI/PhonePe/GooglePay
                  </p>
                  
                  {/* Sample QR Code */}
                  <div className="bg-white p-4 border-2 border-gray-200 rounded-lg inline-block mb-4">
                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <QrCode size={48} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-xs text-gray-500">Sample QR Code</p>
                        <p className="text-xs text-gray-500">Amount: {formatPrice(orderDetails?.total || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-gray-50 p-4 rounded-lg text-left mb-4">
                    <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">UPI ID:</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">merchant@upi</span>
                          <button
                            onClick={() => copyToClipboard('merchant@upi')}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">{formatPrice(orderDetails?.total || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order ID:</span>
                        <span className="font-mono text-sm">{orderId}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg text-sm">
                    <p className="text-blue-800 font-medium mb-1">Next Steps:</p>
                    <ol className="text-blue-700 text-left list-decimal list-inside space-y-1">
                      <li>Scan the QR code or use the UPI ID above</li>
                      <li>Complete the payment of {formatPrice(orderDetails?.total || 0)}</li>
                      <li>Your order will be confirmed and shipped within 24 hours</li>
                      <li>You&apos;ll receive a tracking number via SMS</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => {
                      setShowPaymentModal(false)
                      setPaymentStep('details')
                      // Reset form
                      setCustomerInfo({
                        name: '',
                        phone: '',
                        address: '',
                        city: '',
                        pincode: ''
                      })
                    }}
                    className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom padding for mobile sticky bar */}
      <div className="lg:hidden h-20"></div>
    </div>
  )
}