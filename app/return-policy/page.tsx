import type { Metadata } from 'next'
import { UnderDevelopment } from '@/components/common/under-development'

export const metadata: Metadata = {
  title: 'Return Policy | Saakie by KNK',
  description: 'Our Return Policy page is coming soon.',
}

export default function ReturnPolicyPage() {
  return (
    <UnderDevelopment
      title="Return Policy"
      description="Our Return Policy is being finalised. It will cover returns, exchanges, and refunds for your orders. Please check back soon."
    />
  )
}
