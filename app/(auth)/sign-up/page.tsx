'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Mail, Lock, MailCheck, MailWarning } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import {
  TextField,
  PasswordField,
  SubmitButton,
  ErrorBanner,
} from '@/components/auth/auth-fields'
import { EmailFailureDialog } from '@/components/auth/email-failure-dialog'

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
  // The API reports whether the confirmation link actually left the server.
  // False means the account exists but no email was delivered (misconfigured
  // sender domain, SMTP down) — say so rather than "check your email".
  const [emailSent, setEmailSent] = useState(true)
  const [resendState, setResendState] = useState<
    'idle' | 'sending' | 'sent' | 'failed'
  >('idle')
  // A send failure interrupts rather than sitting quietly in the page: the
  // headline next to it would otherwise be telling them to check their inbox.
  const [showFailureDialog, setShowFailureDialog] = useState(false)

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

      const data = await res.json().catch(() => ({}))
      const sent = data.emailSent !== false
      setEmailSent(sent)
      setRegisteredEmail(email.trim().toLowerCase())
      if (!sent) setShowFailureDialog(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!registeredEmail || resendState === 'sending') return
    setResendState('sending')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
      })
      setResendState(res.ok ? 'sent' : 'failed')
      setEmailSent(res.ok)
      setShowFailureDialog(!res.ok)
    } catch {
      setResendState('failed')
      setEmailSent(false)
      setShowFailureDialog(true)
    }
  }

  if (registeredEmail) {
    return (
      <AuthShell
        eyebrow="One last step"
        title={emailSent ? 'Check your email' : 'Account created'}
        subtitle={
          emailSent
            ? 'Your account is created — it just needs a quick confirmation.'
            : 'Your account is created, but we could not send the confirmation email.'
        }
        panelQuote="From the loom to your wardrobe — join a legacy of artisans."
      >
        <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-8 text-center">
          <div
            className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full ring-1 ${
              emailSent
                ? 'bg-rose-950/60 text-rose-400 ring-rose-800/70'
                : 'bg-amber-950/60 text-amber-400 ring-amber-800/70'
            }`}
          >
            {emailSent ? (
              <MailCheck className="h-6 w-6" aria-hidden="true" />
            ) : (
              <MailWarning className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          {emailSent ? (
            <p className="text-sm leading-relaxed text-gray-300">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-white">
                {registeredEmail}
              </span>
              . Click it to activate your account, then sign in.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-gray-300">
              We could not send the confirmation link to{' '}
              <span className="font-semibold text-white">
                {registeredEmail}
              </span>{' '}
              — this is a problem on our side, not with your details. Your
              account is saved. Please try again in a few minutes, or contact us
              and we will confirm it for you.
            </p>
          )}
          <Link
            href="/sign-in"
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-rose-600 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-rose-600/30 transition-all duration-200 hover:bg-rose-700"
          >
            Go to sign in
          </Link>
          <p className="mt-5 text-xs text-gray-500">
            {resendState === 'sent' ? (
              'A new link is on its way — check your inbox.'
            ) : resendState === 'failed' ? (
              <>
                <span className="text-amber-400">
                  Sending failed — our email service is not reachable right now.
                </span>{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-semibold text-rose-400 underline-offset-2 transition-colors hover:text-rose-300 hover:underline"
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                {emailSent ? "Didn't receive it? " : 'Ready to retry? '}
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

        <EmailFailureDialog
          open={showFailureDialog}
          email={registeredEmail}
          busy={resendState === 'sending'}
          onRetry={handleResend}
          onClose={() => setShowFailureDialog(false)}
        />
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
