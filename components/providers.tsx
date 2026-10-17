'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ToastProvider } from '@/components/ui/toast'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { GoogleTranslateLoader } from '@/components/i18n/google-translate-loader'

// The Fashion Assistant only appears on the home page, after a click, yet
// its code (and the chat window's) shipped with every route. Loaded on
// demand instead, and never server-rendered.
const ChatBubble = dynamic(
  () => import('@/components/chat/chat-bubble').then((m) => m.ChatBubble),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
        <ChatBubble />
        <InstallPrompt />
        <GoogleTranslateLoader />
      </ToastProvider>
    </QueryClientProvider>
  )
}