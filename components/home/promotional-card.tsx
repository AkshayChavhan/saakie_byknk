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
  gradientTo,
  textColorLight,
  textColorExtraLight,
  details
}: PromotionalCardProps) {
  return (
    <Link href={href} className="group h-full">
      <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white rounded-lg p-6 h-48 flex flex-col justify-between hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon className="h-6 w-6" />
              <span className="font-semibold text-lg">{title}</span>
            </div>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </div>
          
          <div className="mb-4">
            <div className="text-3xl font-bold">{mainStat}</div>
            <div className={`text-sm ${textColorLight}`}>{subtitle}</div>
          </div>
        </div>

        {details && (
          <div className="text-sm">
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