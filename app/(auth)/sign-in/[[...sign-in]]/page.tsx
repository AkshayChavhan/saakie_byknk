import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link href="/sign-up" className="font-medium text-red-600 hover:text-red-500">
              create a new account
            </Link>
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-white hover:bg-gray-50 border border-gray-300 text-gray-700",
              formButtonPrimary: "bg-red-600 hover:bg-red-700",
              footerActionLink: "text-red-600 hover:text-red-500",
              identityPreviewEditButtonIcon: "text-red-600",
              formFieldInput: "border-gray-300 focus:border-red-600 focus:ring-red-600",
              formFieldLabel: "text-gray-700",
              dividerLine: "bg-gray-200",
              dividerText: "text-gray-500",
            },
          }}
        />
      </div>
    </div>
  )
}