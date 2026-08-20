'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, MapPin } from 'lucide-react'
import { formatPrice, formatDate, cn } from '@/lib/utils'
import { ORDER_STATUS_STYLES, PAYMENT_STATUS_STYLES, statusLabel } from '@/lib/orders'
import { describePaymentMethod } from '@/lib/payment'

interface OrderAddress {
  name: string
  phone: string
  addressLine1: string
  addressLine2?: string | null
  city: string
  district?: string | null
  state: string
  pincode: string
  country: string
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  total: number
  product: {
    name: string
    slug: string
    images?: { url: string; alt?: string | null }[]
  } | null
}

export interface OrderDetail {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod?: string | null
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  trackingNumber?: string | null
  estimatedDelivery?: string | null
  deliveredAt?: string | null
  createdAt: string
  items: OrderItem[]
  shippingAddress?: OrderAddress | null
  billingAddress?: OrderAddress | null
}

function AddressBlock({ title, address }: { title: string; address: OrderAddress }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-1">
        <MapPin size={15} className="text-gray-400" />
        {title}
      </div>
      <div className="text-sm text-gray-600 leading-relaxed">
        <p>{address.name}</p>
        <p>{address.addressLine1}</p>
        {address.addressLine2 && <p>{address.addressLine2}</p>}
        <p>
          {address.city}, {address.district ? `${address.district}, ` : ''}
          {address.state} {address.pincode}
        </p>
        <p>{address.country}</p>
        <p className="mt-1">{address.phone}</p>
      </div>
    </div>
  )
}

/**
 * Shared presentation of a single order. Used by both the account order-detail
 * page and the post-checkout confirmation page (which sets `confirmation` to
 * show the success banner).
 */
export function OrderDetailView({
  order,
  confirmation = false,
}: {
  order: OrderDetail
  confirmation?: boolean
}) {
  const sameBilling =
    !order.billingAddress ||
    (order.shippingAddress &&
      order.billingAddress.addressLine1 === order.shippingAddress.addressLine1 &&
      order.billingAddress.pincode === order.shippingAddress.pincode)

  return (
    <div className="max-w-3xl mx-auto">
      {confirmation && (
        <div className="text-center mb-8">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
          <h1 className="font-serif mt-4 text-2xl sm:text-3xl font-bold text-gray-900">
            Thank you for your order!
          </h1>
          <p className="mt-2 text-gray-600">
            We&apos;ve received your order and will send updates as it ships.
          </p>
        </div>
      )}

      <div className="card p-5 sm:p-6">
        {/* Header: order number, date, status badges */}
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {confirmation ? 'Order' : 'Order details'} #{order.orderNumber}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                ORDER_STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
              )}
            >
              {statusLabel(order.status)}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                PAYMENT_STATUS_STYLES[order.paymentStatus] || 'bg-gray-100 text-gray-700'
              )}
            >
              Payment: {statusLabel(order.paymentStatus)}
            </span>
          </div>
        </div>

        {/* Tracking / delivery (only when present) */}
        {(order.trackingNumber || order.estimatedDelivery || order.deliveredAt) && (
          <div className="py-4 border-b border-gray-100 text-sm text-gray-600 space-y-1">
            {order.trackingNumber && (
              <p>
                Tracking number:{' '}
                <span className="font-medium text-gray-900">{order.trackingNumber}</span>
              </p>
            )}
            {order.deliveredAt ? (
              <p>Delivered on {formatDate(order.deliveredAt)}</p>
            ) : (
              order.estimatedDelivery && (
                <p>Estimated delivery: {formatDate(order.estimatedDelivery)}</p>
              )
            )}
          </div>
        )}

        {/* Items */}
        <div className="py-4 divide-y divide-gray-100">
          {order.items.map((item) => {
            const img = item.product?.images?.[0]?.url
            const inner = (
              <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                {img ? (
                  <Image
                    src={img}
                    alt={item.product?.name || 'Product'}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-md object-cover bg-gray-100 shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-md bg-gray-100 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.product?.name || 'Product'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Qty {item.quantity} · {formatPrice(item.price)} each
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">
                  {formatPrice(item.total)}
                </p>
              </div>
            )
            return item.product?.slug ? (
              <Link key={item.id} href={`/products/${item.product.slug}`} className="block hover:bg-gray-50 -mx-2 px-2 rounded">
                {inner}
              </Link>
            ) : (
              <div key={item.id}>{inner}</div>
            )
          })}
        </div>

        {/* Totals */}
        <div className="py-4 border-t border-gray-100 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-100 text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {order.paymentMethod && (
            <p className="text-xs text-gray-500 pt-1">
              Payment method: {describePaymentMethod(order.paymentMethod)}
            </p>
          )}
        </div>

        {/* Addresses */}
        {(order.shippingAddress || order.billingAddress) && (
          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {order.shippingAddress && (
              <AddressBlock title="Shipping address" address={order.shippingAddress} />
            )}
            {order.billingAddress && !sameBilling && (
              <AddressBlock title="Billing address" address={order.billingAddress} />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        {confirmation ? (
          <>
            <Link
              href="/account"
              className="inline-flex items-center justify-center px-8 py-3 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-lg active:scale-[0.98]"
            >
              View my orders
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-medium rounded-full border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-all"
            >
              Continue shopping
            </Link>
          </>
        ) : (
          <Link
            href="/account"
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-medium rounded-full border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-all"
          >
            Back to my account
          </Link>
        )}
      </div>
    </div>
  )
}
