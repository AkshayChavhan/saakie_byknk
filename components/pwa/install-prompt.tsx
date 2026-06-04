'use client'

import { useEffect, useState } from 'react'
import { X, Share, Download } from 'lucide-react'

// The `beforeinstallprompt` event isn't in the TS DOM lib yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'

// A branded "Add to Home Screen" banner that gives the storefront its app-like
// install entry point. On Chrome/Edge/Android it captures the native
// `beforeinstallprompt` event and triggers the install flow on tap. iOS Safari
// has no such event, so we instead show the manual Share → Add to Home Screen
// hint. The banner hides itself when already installed (standalone) or once the
// user dismisses it (persisted in localStorage).
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone || localStorage.getItem(DISMISS_KEY)) return

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    // Hide the banner once the app is installed.
    const onInstalled = () => setVisible(false)
    window.addEventListener('appinstalled', onInstalled)

    // iOS Safari: no beforeinstallprompt — detect and show manual instructions.
    const ua = window.navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/crios|fxios|android/i.test(ua)
    if (isIos && isSafari) {
      setIosHint(true)
      setVisible(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl bg-[#161616] p-4 text-white shadow-2xl pb-safe">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#c9a227]/20 text-[#e6c757]">
          <Download size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Install Saakie</p>
          {iosHint ? (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs font-light text-gray-300">
              Tap <Share size={13} className="inline" /> then{' '}
              <span className="font-medium text-white">Add to Home Screen</span>
            </p>
          ) : (
            <p className="mt-1 text-xs font-light text-gray-300">
              Add the app to your home screen for a faster, full-screen experience.
            </p>
          )}
        </div>
      </div>

      {!iosHint && (
        <button
          onClick={install}
          className="mt-3 w-full rounded-full bg-[#c9a227] py-2.5 text-sm font-medium text-[#161616] transition-colors hover:bg-[#e6c757] active:scale-[0.98]"
        >
          Install
        </button>
      )}
    </div>
  )
}
