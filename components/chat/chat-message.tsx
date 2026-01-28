'use client'

import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-gray-900 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
