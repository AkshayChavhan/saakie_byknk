/**
 * Styling for Clerk's <SignIn /> and <SignUp /> so they sit inside AuthShell
 * as if they were the store's own form: the shell's gray-900 surface, gray-800
 * hairlines, and rose-600 as the single accent.
 *
 * The card's own frame and heading are removed — AuthShell already supplies
 * the page heading, and the form should read as part of the column rather
 * than a box floating in it.
 */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: '#e11d48', // rose-600
    colorPrimaryForeground: '#ffffff',
    colorBackground: '#111827', // gray-900
    colorForeground: '#e5e7eb', // gray-200
    colorMutedForeground: '#9ca3af', // gray-400
    colorMuted: '#1f2937', // gray-800
    colorInput: '#1f2937',
    colorInputForeground: '#f9fafb',
    colorNeutral: '#f9fafb',
    colorBorder: '#374151', // gray-700
    colorDanger: '#fb7185', // rose-400
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full max-w-none shadow-none',
    card: 'bg-transparent shadow-none border-0 p-0',
    footer: 'bg-transparent',
    // The six verification-code boxes take no colour from the variables above
    // and vanish against the dark column without an explicit border.
    otpCodeFieldInput: 'border border-gray-600 bg-gray-800 text-gray-50',
  },
} as const

/**
 * Where to send the visitor after signing in, taken from `?callbackUrl=`.
 *
 * Only same-origin relative paths. An absolute URL here would be followed
 * after a genuine sign-in — i.e. /sign-in?callbackUrl=https://evil.example
 * would log the customer in for real and then drop them on someone else's
 * "session expired" page. Middleware only ever sets a pathname, so nothing
 * legitimate is lost.
 */
export function safeCallbackUrl(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : '/'
}
