'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Mail, Lock } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import {
  TextField,
  PasswordField,
  SubmitButton,
  ErrorBanner,
  SuccessBanner,
} from '@/components/auth/auth-fields'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Landed here from a successful /auth/confirm redirect.
  const [verified, setVerified] = useState(
    searchParams.get('verified') === '1'
  )
  // Surface an email-confirmation failure redirected here by /auth/confirm.
  const [error, setError] = useState<string | null>(() =>
    searchParams.get('error') === 'confirmation_failed'
      ? 'Your confirmation link was invalid or has expired. Enter your email below to request a new one.'
      : null
  )
  // True when credentials were right but the email is still unconfirmed —
  // shows the "resend confirmation email" affordance under the error.
  const [needsVerification, setNeedsVerification] = useState(
    searchParams.get('error') === 'confirmation_failed'
  )
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>(
    'idle'
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setVerified(false)
    setNeedsVerification(false)
    setResendState('idle')
    setIsLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setIsLoading(false)

    if (result?.error) {
      if (result.code === 'email_not_verified') {
        setNeedsVerification(true)
        setError(
          'Your email address has not been confirmed yet. Check your inbox for the link, or resend it below.'
        )
      } else {
        setError('Invalid email or password. Please try again.')
      }
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  const handleResend = async () => {
    if (!email.trim() || resendState === 'sending') return
    setResendState('sending')
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setResendState('sent')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {verified && (
        <SuccessBanner message="Your email is confirmed — sign in to continue." />
      )}
      {error && <ErrorBanner message={error} />}
      {needsVerification && (
        <p className="-mt-2 text-center text-xs text-gray-500">
          {resendState === 'sent' ? (
            'If an unverified account exists for this address, a new link is on its way.'
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={!email.trim() || resendState === 'sending'}
              className="font-semibold text-rose-400 underline-offset-2 transition-colors hover:text-rose-300 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendState === 'sending'
                ? 'Sending…'
                : 'Resend confirmation email'}
            </button>
          )}
        </p>
      )}

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

      <div>
        <PasswordField
          id="password"
          label="Password"
          icon={Lock}
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
        />
        <div className="mt-2 text-right">
          <Link
            href="/sign-in"
            className="text-xs font-medium text-rose-400 transition-colors hover:text-rose-300"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <SubmitButton loading={isLoading} loadingLabel="Signing in…">
        Sign in
      </SubmitButton>

      {/* When Google OAuth is added later, a `signIn('google')` button goes here. */}

      <p className="pt-1 text-center text-sm text-gray-400">
        New to Saakie?{' '}
        <Link
          href="/sign-up"
          className="font-semibold text-rose-400 underline-offset-2 transition-colors hover:text-rose-300 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  )
}

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Step back into a world of timeless weaves and curated elegance."
      panelQuote="Drape yourself in heritage — every weave tells a story."
    >
      <Suspense
        fallback={
          <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-8 text-center text-sm text-gray-400">
            Loading…
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthShell>
  )
}
