'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 7000 })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-3 max-w-full sm:max-w-md w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast, onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 300)
  }

  const iconMap = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  }

  const bgColorMap = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }

  const titleColorMap = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  }

  const messageColorMap = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  }

  return (
    <div
      className={`
        pointer-events-auto
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${bgColorMap[toast.type]}
        border rounded-lg shadow-lg p-4
        flex items-start gap-3
        animate-slide-in-right
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {iconMap[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${titleColorMap[toast.type]}`}>
          {toast.title}
        </p>
        {toast.message && (
          <p className={`mt-1 text-sm ${messageColorMap[toast.type]}`}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  )
}

// Standalone toast function for use outside React context
let toastQueue: Array<Omit<Toast, 'id'>> = []
let toastHandler: ((toast: Omit<Toast, 'id'>) => void) | null = null

export function setToastHandler(handler: (toast: Omit<Toast, 'id'>) => void) {
  toastHandler = handler
  // Process any queued toasts
  while (toastQueue.length > 0) {
    const toast = toastQueue.shift()
    if (toast) handler(toast)
  }
}

export const toast = {
  success: (title: string, message?: string) => {
    const t = { type: 'success' as const, title, message }
    if (toastHandler) toastHandler(t)
    else toastQueue.push(t)
  },
  error: (title: string, message?: string) => {
    const t = { type: 'error' as const, title, message, duration: 7000 }
    if (toastHandler) toastHandler(t)
    else toastQueue.push(t)
  },
  warning: (title: string, message?: string) => {
    const t = { type: 'warning' as const, title, message }
    if (toastHandler) toastHandler(t)
    else toastQueue.push(t)
  },
  info: (title: string, message?: string) => {
    const t = { type: 'info' as const, title, message }
    if (toastHandler) toastHandler(t)
    else toastQueue.push(t)
  },
}
