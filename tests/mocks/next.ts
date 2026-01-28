import { vi } from 'vitest'

// Mock NextRequest
export class MockNextRequest {
  url: string
  method: string
  headers: Headers
  nextUrl: URL
  private body: string

  constructor(url: string, options: { method?: string; body?: string | object; headers?: Record<string, string> } = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Headers(options.headers || {})
    this.nextUrl = new URL(url)
    this.body = typeof options.body === 'object' ? JSON.stringify(options.body) : options.body || ''
  }

  async json() {
    return JSON.parse(this.body)
  }

  async text() {
    return this.body
  }
}

// Mock NextResponse
export class MockNextResponse {
  status: number
  headers: Headers
  private body: unknown

  constructor(body: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
    this.body = body
    this.status = options.status || 200
    this.headers = new Headers(options.headers || {})
  }

  async json() {
    return this.body
  }

  static json(data: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
    return new MockNextResponse(data, options)
  }
}

// Create a request helper
export const createRequest = (path: string, options: {
  method?: string
  body?: string | object
  headers?: Record<string, string>
  searchParams?: Record<string, string>
} = {}) => {
  let url = `http://localhost:3000${path}`

  if (options.searchParams) {
    const params = new URLSearchParams(options.searchParams)
    url += `?${params.toString()}`
  }

  return new MockNextRequest(url, options)
}

// Mock auth
export const mockAuth = vi.fn()

export const setupAuthMock = (userId: string | null) => {
  mockAuth.mockResolvedValue({ userId })
}

// Helper to extract JSON from response
export const getResponseJson = async (response: MockNextResponse | Response) => {
  if (response instanceof MockNextResponse) {
    return response.json()
  }
  return response.json()
}

// Helper to get status code
export const getResponseStatus = (response: MockNextResponse | Response) => {
  if (response instanceof MockNextResponse) {
    return response.status
  }
  return response.status
}
