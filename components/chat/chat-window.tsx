'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatMessage } from './chat-message'
import { ProductCardMini } from './product-card-mini'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

interface ChatWindowProps {
  onClose: () => void
}

const QUICK_PROMPTS = [
  'Wedding sarees',
  'Casual wear',
  'Under ₹5000',
  'Silk sarees'
]

export function ChatWindow({ onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your personal fashion assistant. I can help you find the perfect saree for any occasion. What are you looking for today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    await sendMessage(input.trim())
  }

  const sendMessage = async (content: string) => {
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        products: data.products
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    if (!isLoading) {
      sendMessage(prompt)
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-24 right-6 z-50',
        'w-[380px] max-w-[calc(100vw-3rem)]',
        'h-[520px] max-h-[calc(100vh-8rem)]',
        'bg-white rounded-2xl shadow-2xl',
        'flex flex-col overflow-hidden',
        'border border-gray-200',
        'animate-in fade-in slide-in-from-bottom-4 duration-300'
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-yellow-400" />
          <div>
            <h3 className="font-medium text-sm">Fashion Assistant</h3>
            <p className="text-xs text-gray-400">Powered by AI</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded-full transition-colors"
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id}>
            <ChatMessage message={message} />
            {message.products && message.products.length > 0 && (
              <div className="mt-2 ml-0 space-y-2">
                {message.products.map(product => (
                  <ProductCardMini key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => handleQuickPrompt(prompt)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about sarees, styles..."
            className={cn(
              'flex-1 px-4 py-2.5 rounded-full',
              'border border-gray-200 bg-gray-50',
              'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent',
              'text-sm placeholder:text-gray-400'
            )}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'w-10 h-10 rounded-full',
              'bg-gray-900 text-white',
              'flex items-center justify-center',
              'hover:bg-gray-800 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
