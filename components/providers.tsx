'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { ChatBubble } from '@/components/chat'
import { ToastProvider } from '@/components/ui/toast'
import { InstallPrompt } from '@/components/pwa/install-prompt'

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
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <ChatBubble />
          <InstallPrompt />
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}