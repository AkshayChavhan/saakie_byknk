import type { Metadata } from 'next'
import { UnderDevelopment } from '@/components/common/under-development'

export const metadata: Metadata = {
  title: 'Disclaimer | Saakie by KNK',
  description: 'Our Disclaimer page is coming soon.',
}

export default function DisclaimerPage() {
  return (
    <UnderDevelopment
      title="Disclaimer"
      description="Our Disclaimer is being prepared. It will clarify the terms and limitations regarding the information on this site. Please check back soon."
    />
  )
}
