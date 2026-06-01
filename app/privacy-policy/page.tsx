import type { Metadata } from 'next'
import { UnderDevelopment } from '@/components/common/under-development'

export const metadata: Metadata = {
  title: 'Privacy Policy | Saakie by KNK',
  description: 'Our Privacy Policy page is coming soon.',
}

export default function PrivacyPolicyPage() {
  return (
    <UnderDevelopment
      title="Privacy Policy"
      description="Our Privacy Policy is being finalised. It will explain how we collect, use, and protect your personal information. Please check back soon."
    />
  )
}
