import type { Metadata } from 'next'
import { SignIn } from '@clerk/nextjs'
import { AuthShell } from '@/components/auth/auth-shell'
import { clerkAuthAppearance, safeCallbackUrl } from '@/components/auth/clerk-appearance'

export const metadata: Metadata = {
  title: 'Sign in | Saakie_byknk',
}

/**
 * Sign-in, rendered by Clerk: email + password, email code, Google/GitHub,
 * forgot password, and the new-device email check. Which of those appear is
 * set in the Clerk dashboard, not here.
 *
 * The folder is a catch-all because Clerk routes each step of the flow under
 * this path (/sign-in/factor-one, /sign-in/sso-callback, …).
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl)

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Step back into a world of timeless weaves and curated elegance."
      panelQuote="Drape yourself in heritage — every weave tells a story."
    >
      <SignIn
        appearance={clerkAuthAppearance}
        fallbackRedirectUrl={callbackUrl}
        signUpFallbackRedirectUrl={callbackUrl}
      />
    </AuthShell>
  )
}
