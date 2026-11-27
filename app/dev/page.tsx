import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'

export const metadata: Metadata = {
  title: 'Developer | Saakie by KNK',
  description: 'Meet the developer behind Saakie by KNK.',
  robots: { index: false },
}

// The portfolio is embedded rather than linked so visitors stay on this site
// and the external address is never shown.
const PORTFOLIO_SRC = 'https://akshaychavhan.vercel.app/'

export default function DevPage() {
  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <Header />
      <iframe
        src={PORTFOLIO_SRC}
        title="Developer portfolio"
        className="w-full flex-1 border-0"
        referrerPolicy="no-referrer"
        loading="eager"
      />
    </div>
  )
}
