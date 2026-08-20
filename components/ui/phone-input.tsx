'use client'

import { useId } from 'react'
import {
  PHONE_COUNTRIES,
  getCountry,
  splitPhone,
  formatPhone,
  isValidNationalNumber,
  digitsOnly,
} from '@/lib/phone'

interface PhoneInputProps {
  /** Full stored value, e.g. "+91 9876543210". Legacy bare digits also parse. */
  value: string
  /** Fires with the canonical "+<dial> <digits>" form ("" when cleared). */
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * Country code + national number, as one control. Defaults to India and
 * emits the canonical stored form on every change. Shows its own inline
 * error while the number is invalid — callers gate submission with
 * `isValidPhone` from lib/phone so the rules live in exactly one place.
 */
export function PhoneInput({ value, onChange, disabled }: PhoneInputProps) {
  const errorId = useId()
  const { country, national } = splitPhone(value)
  const showError = national.length > 0 && !isValidNationalNumber(country, national)

  const emit = (iso: string, nationalNext: string) => {
    const digits = digitsOnly(nationalNext)
    onChange(digits ? formatPhone(getCountry(iso), digits) : '')
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          className="input w-auto shrink-0 pr-7"
          value={country.iso}
          disabled={disabled}
          aria-label="Country code"
          onChange={(e) => emit(e.target.value, national)}
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.iso} +{c.dial}
            </option>
          ))}
        </select>
        <input
          className="input flex-1"
          type="tel"
          inputMode="numeric"
          value={national}
          disabled={disabled}
          placeholder={country.iso === 'IN' ? '10-digit mobile number' : 'Phone number'}
          aria-invalid={showError}
          aria-describedby={showError ? errorId : undefined}
          onChange={(e) => emit(country.iso, e.target.value)}
        />
      </div>
      {showError && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {country.iso === 'IN'
            ? 'Enter a valid 10-digit Indian mobile number (starts with 6–9).'
            : `Enter a valid ${country.name} number (${country.lengths.join(' or ')} digits).`}
        </p>
      )}
    </div>
  )
}
