'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatWindow } from './chat-window'

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Chat Window */}
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}

      {/* Floating Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full',
          'bg-gray-900 text-white',
          'shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-300 hover:scale-105',
          'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
      >
        <span
          className={cn(
            'transition-transform duration-300',
            isOpen && 'rotate-90'
          )}
        >
          {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </span>
      </button>
    </>
  )
}
