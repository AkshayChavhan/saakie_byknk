import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Read the pattern out of the source rather than importing middleware.ts:
// importing it pulls in Clerk's server bundle, which expects the Next runtime
// and its keys. Parsing the shipped literal still tests the real matcher — and
// Next parses it statically too.
const source = readFileSync(resolve(process.cwd(), 'middleware.ts'), 'utf8')

// Take the `matcher:` line and pull the quoted literals out of it. Bounding by
// the surrounding brackets does not work: the pattern itself contains `]`
// (inside `[\w]`), so a bracket match truncates it mid-literal.
const matcherLine = source.split('\n').find((line) => line.trim().startsWith('matcher:'))
if (!matcherLine) throw new Error('middleware.ts no longer declares config.matcher')
const literals = matcherLine.match(/'(?:[^'\\]|\\.)*'/g)
if (!literals?.length) throw new Error('config.matcher declares no patterns')

// The file is TypeScript source, so `\\.` in the literal is one escaped
// backslash. JSON.parse un-escapes it back to the real pattern.
const patterns: string[] = literals.map((raw) =>
  JSON.parse(`"${raw.slice(1, -1).replace(/"/g, '\\"')}"`)
)

const config = { matcher: patterns }

/**
 * The matcher decides which requests clerkMiddleware sees. `auth()` in a route
 * handler throws on a request the middleware skipped, so no API path may be
 * excluded — including the /api/auth prefix the Auth.js setup had to carve out.
 */
const matches = (pathname: string) =>
  config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(pathname))

describe('middleware matcher', () => {
  describe('no API route is left without the middleware', () => {
    it.each([
      '/api/users/profile',
      '/api/webhooks/clerk',
      '/api/auth/session',
      '/api/auth',
    ])('matches %s', (pathname) => {
      expect(matches(pathname)).toBe(true)
    })
  })

  describe("Clerk's own sign-in steps run through the middleware", () => {
    it.each(['/sign-in/factor-one', '/sign-in/sso-callback', '/sign-up/verify-email-address'])(
      'matches %s',
      (pathname) => {
        expect(matches(pathname)).toBe(true)
      }
    )
  })

  describe('everything the middleware actually guards still runs', () => {
    it.each([
      '/',
      '/account',
      '/admin',
      '/admin/settings',
      '/checkout',
      '/products/kanjivaram-silk',
      '/sign-in',
    ])('still matches %s', (pathname) => {
      expect(matches(pathname)).toBe(true)
    })

    it('still matches API routes, which read the session for their own checks', () => {
      expect(matches('/api/cart')).toBe(true)
      expect(matches('/api/orders')).toBe(true)
      expect(matches('/api/admin/backup')).toBe(true)
    })

    // Only a file extension excludes a path — a dotless look-alike keeps it.
    it('does not over-exclude look-alike paths', () => {
      expect(matches('/api/authors')).toBe(true)
      expect(matches('/_nextish')).toBe(true)
    })
  })

  describe('static assets stay untouched', () => {
    it.each(['/_next/static/chunk.js', '/_next/image', '/favicon.ico', '/logo.png', '/sw.js'])(
      'excludes %s',
      (pathname) => {
        expect(matches(pathname)).toBe(false)
      }
    )
  })
})
