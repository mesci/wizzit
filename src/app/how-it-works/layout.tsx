import { Metadata } from 'next'
import { getMetadataBaseUrl } from '@/lib/config'

const baseUrl = getMetadataBaseUrl()

export const metadata: Metadata = {
  title: 'How It Works | P2P File Transfer Technology',
  description: 'Discover how Wizzit uses WebRTC technology for secure peer-to-peer file transfers. Learn about our encryption, infrastructure, and direct transfer technology.',
  keywords: 'how p2p file transfer works, WebRTC file sharing, peer to peer technology, direct file transfer, encrypted file sharing, NAT traversal, TURN server',
  openGraph: {
    title: 'How It Works | P2P File Transfer Technology',
    description: 'Discover how Wizzit uses WebRTC technology for secure peer-to-peer file transfers. Learn about our encryption and infrastructure.',
    url: `${baseUrl}/how-it-works`,
    images: [
      {
        url: '/og-how-it-works.png',
        width: 1200,
        height: 630,
        alt: 'How Wizzit P2P File Transfer Works',
      },
    ],
  },
  twitter: {
    title: 'How It Works | P2P File Transfer Technology',
    description: 'Discover how Wizzit uses WebRTC technology for secure peer-to-peer file transfers. Learn about our encryption and infrastructure.',
    images: ['/og-how-it-works.png'],
  },
}

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 