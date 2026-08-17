'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Mail, Lock, MailCheck } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import {
  TextField,
  PasswordField,
  SubmitButton,
  ErrorBanner,
} from '@/components/auth/auth-fields'

export default function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Set once registration succeeds — swaps the form for the "check your email"
  // screen. The account stays unusable until the emailed link is clicked
  // (authorize() refuses unverified users), so there is no auto sign-in here.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>(
    'idle'
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      setIsLoading(false)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // The API returns errors as either a string (`{ error: '...' }`) or an
        // object (`{ error: { message, code } }`). Normalise to a string so we
        // never hand React a non-renderable object (React error #31).
        const message =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ||
              'Could not create your account. Please try again.'
        setError(message)
        return
      }

      setRegisteredEmail(email.trim().toLowerCase())
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!registeredEmail || resendState === 'sending') return
    setResendState('sending')
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
      })
    } finally {
      setResendState('sent')
    }
  }

  if (registeredEmail) {
    return (
      <AuthShell
        eyebrow="One last step"
        title="Check your email"
        subtitle="Your account is created — it just needs a quick confirmation."
        panelQuote="From the loom to your wardrobe — join a legacy of artisans."
      >
        <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-950/60 text-rose-400 ring-1 ring-rose-800/70">
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm leading-relaxed text-gray-300">
            We sent a confirmation link to{' '}
            <span className="font-semibold text-white">{registeredEmail}</span>.
            Click it to activate your account, then sign in.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-rose-600 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-rose-600/30 transition-all duration-200 hover:bg-rose-700"
          >
            Go to sign in
          </Link>
          <p className="mt-5 text-xs text-gray-500">
            {resendState === 'sent' ? (
              'A new link is on its way — check your inbox.'
            ) : (
              <>
                Didn&apos;t receive it?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === 'sending'}
                  className="font-semibold text-rose-400 underline-offset-2 transition-colors hover:text-rose-300 hover:underline disabled:opacity-60"
                >
                  {resendState === 'sending' ? 'Sending…' : 'Resend email'}
                </button>
              </>
            )}
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Join the family"
      title="Create your account"
      subtitle="Begin your journey through India's finest handpicked sarees."
      panelQuote="From the loom to your wardrobe — join a legacy of artisans."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <ErrorBanner message={error} />}

        <TextField
          id="name"
          label="Full name"
          icon={User}
          autoComplete="name"
          required
          value={name}
          onChange={setName}
          placeholder="Your name"
        />

        <TextField
          id="email"
          label="Email address"
          type="email"
          icon={Mail}
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />

        <PasswordField
          id="password"
          label="Password"
          icon={Lock}
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={setPassword}
          placeholder="Create a password"
          hint="At least 8 characters."
        />

        <SubmitButton loading={isLoading} loadingLabel="Creating account…">
          Create account
        </SubmitButton>

        {/* When Google OAuth is added later, a `signIn('google')` button goes here. */}

        <p className="pt-1 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="font-semibold text-rose-400 underline-offset-2 transition-colors hover:text-rose-300 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
