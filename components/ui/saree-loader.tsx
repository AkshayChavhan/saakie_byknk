'use client'

import { cn } from '@/lib/utils'

interface SareeLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
  fullScreen?: boolean
}

export function SareeLoader({
  size = 'md',
  text = 'Loading...',
  className,
  fullScreen = false
}: SareeLoaderProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const loader = (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      {/* Saree Drape Animation */}
      <div className={cn("relative", sizeClasses[size])}>
        {/* Outer flowing drape */}
        <div className="absolute inset-0 saree-drape-outer">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="sareeGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e11d48" />
                <stop offset="50%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
              <linearGradient id="sareeGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#fdba74" />
              </linearGradient>
              <linearGradient id="sareeGradient3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>

            {/* Flowing fabric paths */}
            <path
              className="saree-flow-1"
              d="M50 10 Q70 25 60 50 Q50 75 70 90"
              fill="none"
              stroke="url(#sareeGradient1)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              className="saree-flow-2"
              d="M50 10 Q30 25 40 50 Q50 75 30 90"
              fill="none"
              stroke="url(#sareeGradient2)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              className="saree-flow-3"
              d="M20 50 Q35 40 50 50 Q65 60 80 50"
              fill="none"
              stroke="url(#sareeGradient3)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Inner spinning element - representing pallu/border design */}
        <div className="absolute inset-2 saree-spin">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Decorative border pattern */}
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="url(#borderGradient)"
              strokeWidth="2"
              strokeDasharray="8 4"
              className="saree-border"
            />

            {/* Traditional motifs */}
            <g className="saree-motifs">
              <circle cx="50" cy="15" r="4" fill="#e11d48" />
              <circle cx="85" cy="50" r="4" fill="#f97316" />
              <circle cx="50" cy="85" r="4" fill="#a855f7" />
              <circle cx="15" cy="50" r="4" fill="#ec4899" />
            </g>
          </svg>
        </div>

        {/* Center element - like a brooch/pin */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="saree-center-glow w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg" />
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 saree-shimmer rounded-full" />
      </div>

      {/* Loading text with wave animation */}
      {text && (
        <div className={cn("flex items-center gap-0.5", textSizeClasses[size])}>
          {text.split('').map((char, index) => (
            <span
              key={index}
              className="saree-text-wave text-gray-600 font-medium"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {loader}
      </div>
    )
  }

  return loader
}

// Alternative: Elegant Drape Loader
export function SareeDrapeLoader({
  className,
  fullScreen = false
}: { className?: string; fullScreen?: boolean }) {
  const loader = (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      <div className="relative w-20 h-32">
        {/* Multiple flowing fabric strips */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute top-0 w-3 h-full rounded-full saree-fabric-strip"
            style={{
              left: `${i * 18}%`,
              background: `linear-gradient(180deg,
                ${['#e11d48', '#f97316', '#a855f7', '#ec4899', '#f43f5e'][i]} 0%,
                ${['#fb7185', '#fdba74', '#e879f9', '#f9a8d4', '#fda4af'][i]} 50%,
                ${['#e11d48', '#f97316', '#a855f7', '#ec4899', '#f43f5e'][i]} 100%)`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}

        {/* Gold border at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-full saree-gold-shimmer" />
      </div>

      <p className="text-sm text-gray-500 font-medium tracking-wide">
        Weaving magic...
      </p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-orange-50">
        {loader}
      </div>
    )
  }

  return loader
}

// Compact spinner version
export function SareeSpinner({
  size = 'md',
  className
}: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 rounded-full border-2 border-rose-200" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose-500 border-r-orange-500 saree-spin" />
      <div className="absolute inset-1 rounded-full border border-transparent border-b-amber-400 saree-spin-reverse" />
    </div>
  )
}
