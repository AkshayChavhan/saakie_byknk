'use client'

import Link from 'next/link'
import { ArrowRight, LucideIcon } from 'lucide-react'

interface PromotionalCardProps {
  title: string
  icon: LucideIcon
  mainStat: string | number
  subtitle: string
  href: string
  gradientFrom: string
  /** Optional middle gradient stop for a richer, multi-tone look. */
  gradientVia?: string
  gradientTo: string
  textColorLight: string
  textColorExtraLight: string
  details?: {
    label: string
    value: string
    extra?: string
  }
}

export function PromotionalCard({
  title,
  icon: Icon,
  mainStat,
  subtitle,
  href,
  gradientFrom,
  gradientVia,
  gradientTo,
  textColorLight,
  textColorExtraLight,
  details
}: PromotionalCardProps) {
  return (
    <Link href={href} className="group h-full">
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${gradientFrom} ${gradientVia ?? ''} ${gradientTo} text-white rounded-2xl p-6 h-48 flex flex-col justify-between shadow-md ring-1 ring-white/10 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5`}
      >
        {/* Soft radial sheen for depth */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        {/* Diagonal gloss that sweeps on hover */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25 backdrop-blur-sm">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-semibold text-lg tracking-tight">{title}</span>
            </div>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold drop-shadow-sm">{mainStat}</div>
            <div className={`text-sm ${textColorLight}`}>{subtitle}</div>
          </div>
        </div>

        {details && (
          <div className="relative text-sm">
            <div className={`${textColorLight} mb-1`}>{details.label}</div>
            <div className="font-medium truncate">{details.value}</div>
            {details.extra && (
              <div className={`text-xs ${textColorExtraLight}`}>
                {details.extra}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}