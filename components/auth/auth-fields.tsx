'use client'

import { useState } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Form primitives shared by the sign-in and sign-up screens, in the same dark
 * palette as the mobile side menu — gray-800 fills, gray-700 hairlines, and
 * rose for focus and the primary action. Styling only: these are plain
 * controlled inputs, so callers keep full ownership of state and the NextAuth
 * submit logic.
 */

const baseInput =
  'w-full rounded-xl border border-gray-700 bg-gray-800/60 py-3 pl-11 pr-4 text-[15px] text-white placeholder:text-gray-500 shadow-sm transition-all duration-200 focus:border-rose-500 focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30'

interface TextFieldProps {
  id: string
  label: string
  type?: string
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  placeholder?: string
}

export function TextField({
  id,
  label,
  type = 'text',
  icon: Icon,
  value,
  onChange,
  autoComplete,
  required,
  placeholder,
}: TextFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-200"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
          aria-hidden="true"
        />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseInput}
        />
      </div>
    </div>
  )
}

interface PasswordFieldProps {
  id: string
  label: string
  icon: LucideIcon
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
  placeholder?: string
  /** Optional helper text shown beneath the field. */
  hint?: string
}

export function PasswordField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  placeholder,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-200"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
          aria-hidden="true"
        />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(baseInput, 'pr-11')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        >
          {visible ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

/**
 * Primary submit button with a sheen sweep and a built-in loading spinner.
 * Wears the exact treatment the side menu gives its active link —
 * `bg-rose-600` under a `shadow-rose-600/30` glow.
 */
export function SubmitButton({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean
  loadingLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-rose-600 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-rose-600/30 transition-all duration-200 hover:bg-rose-700 hover:shadow-xl active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {/* Sheen sweep on hover */}
      <span
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden="true"
      />
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}

/** Inline error banner, tinted rose to read as a warning on the dark surface. */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-fade-in rounded-xl border border-rose-800/70 bg-rose-950/50 px-4 py-3 text-sm text-rose-200"
    >
      {message}
    </div>
  )
}
