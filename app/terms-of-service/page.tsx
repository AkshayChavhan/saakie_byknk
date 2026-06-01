import type { Metadata } from 'next'
import { UnderDevelopment } from '@/components/common/under-development'

export const metadata: Metadata = {
  title: 'Terms of Service | Saakie by KNK',
  description: 'Our Terms of Service page is coming soon.',
}

export default function TermsOfServicePage() {
  return (
    <UnderDevelopment
      title="Terms of Service"
      description="Our Terms of Service are being prepared. They will outline the rules and conditions for using Saakie by KNK. Please check back soon."
    />
  )
}
