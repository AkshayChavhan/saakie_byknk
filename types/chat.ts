export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  products?: RecommendedProduct[]
}

export interface RecommendedProduct {
  id: string
  name: string
  slug: string
  price: number
  image: string
  category: string
}

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
}

export interface ChatResponse {
  message: string
  products: RecommendedProduct[]
}
