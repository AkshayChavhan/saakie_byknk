'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { CartItem as CartItemType } from '@/lib/cart'

interface CartItemProps {
  item: CartItemType
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<void>
  onRemoveItem: (itemId: string) => Promise<void>
  isUpdating?: boolean
}

export function CartItem({ item, onUpdateQuantity, onRemoveItem, isUpdating }: CartItemProps) {
  const [quantity, setQuantity] = useState(item.quantity)
  const [isLocalUpdating, setIsLocalUpdating] = useState(false)

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity === quantity) return
    
    setIsLocalUpdating(true)
    try {
      await onUpdateQuantity(item.id, newQuantity)
      setQuantity(newQuantity)
    } catch (error) {
      console.error('Failed to update quantity:', error)
    } finally {
      setIsLocalUpdating(false)
    }
  }

  const handleRemove = async () => {
    if (window.confirm('Remove this item from your cart?')) {
      setIsLocalUpdating(true)
      try {
        await onRemoveItem(item.id)
      } catch (error) {
        console.error('Failed to remove item:', error)
        setIsLocalUpdating(false)
      }
    }
  }

  const primaryImage = item.product.images.find(img => img.isPrimary) || item.product.images[0]
  const isDisabled = isUpdating || isLocalUpdating

  return (
    <div className="flex items-center gap-4 py-6 border-b">
      <div className="flex-shrink-0">
        <Link href={`/products/${item.product.slug}`}>
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt || item.product.name}
                fill
                className="object-cover hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>
        </Link>
      </div>

      <div className="flex-1 min-w-0">
        <Link 
          href={`/products/${item.product.slug}`}
          className="block hover:text-red-600 transition-colors"
        >
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {item.product.name}
          </h3>
        </Link>
        
        <div className="flex items-center gap-4 mt-2">
          <p className="text-lg font-semibold text-gray-900">
            ₹{item.price.toLocaleString()}
          </p>
          
          {item.price !== item.product.price && (
            <p className="text-sm text-gray-500 line-through">
              ₹{item.product.price.toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center border rounded-lg">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={isDisabled || quantity <= 1}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus size={16} />
            </button>
            
            <span className="px-4 py-2 border-x min-w-[60px] text-center">
              {quantity}
            </span>
            
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={isDisabled || quantity >= item.product.stock}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={handleRemove}
            disabled={isDisabled}
            className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remove item"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {item.product.stock < 10 && (
          <p className="text-sm text-orange-600 mt-2">
            Only {item.product.stock} left in stock
          </p>
        )}
        
        {item.product.stock === 0 && (
          <p className="text-sm text-red-600 mt-2">
            Out of stock
          </p>
        )}
      </div>

      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">
          ₹{(item.price * quantity).toLocaleString()}
        </p>
      </div>
    </div>
  )
}