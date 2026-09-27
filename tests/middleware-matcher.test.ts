import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Read the pattern out of the source rather than importing middleware.ts:
// importing it pulls in next-auth, which resolves `next/server` against its own
// nested node_modules and blows up outside the Next build. Parsing the shipped
// literal still tests the real matcher — and Next parses it statically too.
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
 * The matcher decides which requests get a SECOND Auth.js instance layered on
 * top of the one in `app/api/auth/[...nextauth]`. Auth.js's own routes must be
 * excluded, or both write session cookies onto the same response and the last
 * one wins — which is how a sign-out ends up undone.
 */
const matches = (pathname: string) =>
  config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(pathname))

describe('middleware matcher', () => {
  describe("Auth.js's own routes must run middleware-free", () => {
    it.each([
      '/api/auth/signout',
      '/api/auth/session',
      '/api/auth/csrf',
      '/api/auth/callback/credentials',
      '/api/auth/providers',
    ])('excludes %s', (pathname) => {
      expect(matches(pathname)).toBe(false)
    })
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

    it('still matches non-auth API routes, which read the session for their own checks', () => {
      expect(matches('/api/cart')).toBe(true)
      expect(matches('/api/orders')).toBe(true)
      expect(matches('/api/admin/backup')).toBe(true)
    })

    // A path that merely starts with the same letters is a different route and
    // must keep its middleware.
    it('does not over-exclude look-alike paths', () => {
      expect(matches('/api/authors')).toBe(true)
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
