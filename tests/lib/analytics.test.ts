import { describe, it, expect } from 'vitest'
import { getUmamiConfig, DEFAULT_UMAMI_SCRIPT_URL } from '@/lib/analytics'

const ID = '123e4567-e89b-42d3-a456-426614174000'

describe('getUmamiConfig', () => {
  it('stays off until a website id is set', () => {
    expect(getUmamiConfig({})).toBeNull()
    expect(getUmamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: '' })).toBeNull()
    expect(getUmamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: '   ' })).toBeNull()
  })

  it('rejects an id that is not a UUID, so a typo never loads a script', () => {
    expect(getUmamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'not-an-id' })).toBeNull()
    expect(getUmamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: ID + 'x' })).toBeNull()
  })

  it('uses Umami Cloud by default', () => {
    expect(getUmamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: ID })).toMatchObject({
      websiteId: ID,
      src: DEFAULT_UMAMI_SCRIPT_URL,
    })
  })

  it('accepts a self-hosted https script but never an insecure one', () => {
    expect(
      getUmamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: ID, NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'https://stats.example.com/script.js' })?.src
    ).toBe('https://stats.example.com/script.js')
    expect(
      getUmamiConfig({ NEXT_PUBLIC_UMAMI_WEBSITE_ID: ID, NEXT_PUBLIC_UMAMI_SCRIPT_URL: 'http://stats.example.com/script.js' })
    ).toBeNull()
  })

  it('limits reporting to the production host and its www twin', () => {
    const base = { NEXT_PUBLIC_UMAMI_WEBSITE_ID: ID }
    expect(getUmamiConfig({ ...base, NEXT_PUBLIC_APP_URL: 'https://saakiebyknk.in' })?.domains).toBe(
      'saakiebyknk.in,www.saakiebyknk.in'
    )
    expect(getUmamiConfig({ ...base, NEXT_PUBLIC_APP_URL: 'https://www.saakiebyknk.in/' })?.domains).toBe(
      'www.saakiebyknk.in,saakiebyknk.in'
    )
  })

  it('does not restrict hosts for localhost, plain http, or a missing app url', () => {
    const base = { NEXT_PUBLIC_UMAMI_WEBSITE_ID: ID }
    expect(getUmamiConfig({ ...base, NEXT_PUBLIC_APP_URL: 'https://localhost' })?.domains).toBeNull()
    expect(getUmamiConfig({ ...base, NEXT_PUBLIC_APP_URL: 'http://localhost:3000' })?.domains).toBeNull()
    expect(getUmamiConfig(base)?.domains).toBeNull()
    expect(getUmamiConfig({ ...base, NEXT_PUBLIC_APP_URL: 'garbage' })?.domains).toBeNull()
  })

  it('lets an explicit domain list win', () => {
    expect(
      getUmamiConfig({
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: ID,
        NEXT_PUBLIC_APP_URL: 'https://saakiebyknk.in',
        NEXT_PUBLIC_UMAMI_DOMAINS: 'shop.example.com',
      })?.domains
    ).toBe('shop.example.com')
  })
})
