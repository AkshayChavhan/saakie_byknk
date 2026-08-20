'use client'

/**
 * Checkout payment picker — the Flipkart/Amazon pattern: one radio row per
 * instrument, the selected row expanding into its own panel, and a single
 * "place order" action owned by the parent.
 *
 * The prepaid channels are all fulfilled by the Razorpay modal; picking one
 * here only decides which block that modal opens on (see `lib/razorpay-client`).
 */

import { Building2, CreditCard, Smartphone, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PAYMENT_CHANNELS,
  isChannelAvailable,
  isValidUpiId,
  type PaymentChannel,
} from '@/lib/payment'

const ICONS: Record<PaymentChannel, React.ComponentType<{ size?: number; className?: string }>> = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Building2,
  wallet: Wallet,
}

export interface PaymentMethodsProps {
  selected: PaymentChannel | null
  onSelect: (channel: PaymentChannel) => void
  /** NEXT_PUBLIC_RAZORPAY_KEY_ID is present. */
  onlineConfigured: boolean
  /** Optional UPI VPA, prefilled into the Razorpay modal. */
  upiId: string
  onUpiIdChange: (value: string) => void
  /** Lock the picker while an order is being placed. */
  busy?: boolean
}

/** Why a channel can't be picked, or null when it can. */
function unavailableReason(
  channel: PaymentChannel,
  gates: Pick<PaymentMethodsProps, 'onlineConfigured'>
): string | null {
  if (isChannelAvailable(channel, gates)) return null
  return 'Online payment is temporarily unavailable'
}

export function PaymentMethods({
  selected,
  onSelect,
  onlineConfigured,
  upiId,
  onUpiIdChange,
  busy = false,
}: Readonly<PaymentMethodsProps>) {
  const upiIdTouched = upiId.trim().length > 0
  const upiIdValid = isValidUpiId(upiId)

  return (
    <div role="radiogroup" aria-label="Payment method" className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
      {PAYMENT_CHANNELS.map((channel) => {
        const Icon = ICONS[channel.id]
        const reason = unavailableReason(channel.id, { onlineConfigured })
        const disabled = reason !== null || busy
        const isSelected = selected === channel.id

        return (
          <div key={channel.id} className={cn(isSelected && 'bg-gray-50')}>
            <label
              className={cn(
                'flex items-start gap-3 p-4',
                disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:bg-gray-50'
              )}
            >
              <input
                type="radio"
                name="paymentChannel"
                className="mt-1 accent-gray-900"
                value={channel.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onSelect(channel.id)}
              />
              <Icon size={20} className="mt-0.5 shrink-0 text-gray-700" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-900">{channel.label}</span>
                <span className="block text-xs text-gray-500">{channel.blurb}</span>
                {reason && <span className="mt-1 block text-xs text-amber-700">{reason}</span>}
                {!reason && channel.brands.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {channel.brands.map((brand) => (
                      <span
                        key={brand}
                        className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600"
                      >
                        {brand}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </label>

            {isSelected && !reason && (
              <div className="px-4 pb-4 pl-[3.25rem] text-xs text-gray-600">
                <p>{channel.detail}</p>

                {channel.id === 'upi' && (
                  <div className="mt-3">
                    <label htmlFor="upi-id" className="block font-medium text-gray-700">
                      UPI ID <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="upi-id"
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      placeholder="yourname@bank"
                      value={upiId}
                      disabled={busy}
                      onChange={(e) => onUpiIdChange(e.target.value)}
                      aria-invalid={upiIdTouched && !upiIdValid}
                      className="input mt-1 w-full max-w-xs text-sm"
                    />
                    <p className={cn('mt-1', upiIdTouched && !upiIdValid ? 'text-amber-700' : 'text-gray-500')}>
                      {upiIdTouched && !upiIdValid
                        ? "That doesn't look like a UPI ID — you can still continue and pick your app on the next screen."
                        : 'Leave blank to choose your UPI app on the next screen.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
