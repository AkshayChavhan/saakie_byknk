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
} from '@/components/auth/auth-fields'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setIsLoading(false)

    if (result?.error) {
      setError('Invalid email or password. Please try again.')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <ErrorBanner message={error} />}

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
            className="text-xs font-medium text-marigold-700 transition-colors hover:text-maroon-700"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <SubmitButton loading={isLoading} loadingLabel="Signing in…">
        Sign in
      </SubmitButton>

      {/* When Google OAuth is added later, a `signIn('google')` button goes here. */}

      <p className="pt-1 text-center text-sm text-maroon-700/80">
        New to Saakie?{' '}
        <Link
          href="/sign-up"
          className="font-semibold text-maroon-700 underline-offset-2 hover:underline"
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
          <div className="rounded-xl border border-maroon-100 bg-white/60 p-8 text-center text-sm text-maroon-500">
            Loading…
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthShell>
  )
}
