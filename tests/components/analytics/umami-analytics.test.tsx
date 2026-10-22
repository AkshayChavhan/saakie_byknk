import { describe, it, expect, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { UmamiAnalytics } from '@/components/analytics/umami-analytics'

const ID = '123e4567-e89b-42d3-a456-426614174000'

describe('UmamiAnalytics', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    document.head.querySelectorAll('script[data-website-id]').forEach((s) => s.remove())
    document.body.querySelectorAll('script[data-website-id]').forEach((s) => s.remove())
  })

  it('renders nothing and loads no script when no website id is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', '')
    const { container } = render(<UmamiAnalytics />)

    expect(container).toBeEmptyDOMElement()
    expect(document.querySelector('script[data-website-id]')).toBeNull()
  })

  it('loads the script with the id, Do Not Track and the production hosts once configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', ID)
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://saakiebyknk.in')
    render(<UmamiAnalytics />)

    const script = document.querySelector('script[data-website-id]') as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script!.getAttribute('src')).toBe('https://cloud.umami.is/script.js')
    expect(script!.getAttribute('data-website-id')).toBe(ID)
    expect(script!.getAttribute('data-do-not-track')).toBe('true')
    expect(script!.getAttribute('data-domains')).toBe('saakiebyknk.in,www.saakiebyknk.in')
  })
})
