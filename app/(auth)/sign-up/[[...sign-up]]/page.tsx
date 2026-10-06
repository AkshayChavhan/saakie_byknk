import type { Metadata } from 'next'
import { SignUp } from '@clerk/nextjs'
import { AuthShell } from '@/components/auth/auth-shell'
import { clerkAuthAppearance, safeCallbackUrl } from '@/components/auth/clerk-appearance'

export const metadata: Metadata = {
  title: 'Create account | Saakie_byknk',
}

/**
 * Sign-up, rendered by Clerk, including the email verification step
 * (/sign-up/verify-email-address — hence the catch-all folder).
 *
 * No store account is created here. The first authenticated request after
 * sign-up does that — see `auth()` in auth.ts — along with the cart and
 * wishlist every user gets.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>
}) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl)

  return (
    <AuthShell
      eyebrow="Join the family"
      title="Create your account"
      subtitle="Begin your journey through India's finest handpicked sarees."
      panelQuote="From the loom to your wardrobe — join a legacy of artisans."
    >
      <SignUp
        appearance={clerkAuthAppearance}
        fallbackRedirectUrl={callbackUrl}
        signInFallbackRedirectUrl={callbackUrl}
      />
    </AuthShell>
  )
}
