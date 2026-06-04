'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { User, Mail, Lock } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import {
  TextField,
  PasswordField,
  SubmitButton,
  ErrorBanner,
} from '@/components/auth/auth-fields'

export default function SignUpPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
        setIsLoading(false)
        return
      }

      // Registration succeeded — sign the new user in.
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      setIsLoading(false)

      if (result?.error) {
        // Account exists but sign-in failed — send them to sign-in.
        router.push('/sign-in')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
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

        <p className="pt-1 text-center text-sm text-maroon-700/80">
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="font-semibold text-maroon-700 underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
