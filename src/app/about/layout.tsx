import { Metadata } from 'next'
import { getMetadataBaseUrl } from '@/lib/config'

const baseUrl = getMetadataBaseUrl()

export const metadata: Metadata = {
  title: 'About Wizzit | P2P File Sharing Mission',
  description: 'Learn about Wizzit\'s mission to create a more private, sustainable way to share files. Direct peer-to-peer transfers with bank-level encryption.',
  keywords: 'about wizzit, p2p file sharing mission, private file transfer, sustainable file sharing, no server storage, peer to peer philosophy',
  openGraph: {
    title: 'About Wizzit | P2P File Sharing Mission',
    description: 'Learn about Wizzit\'s mission to create a more private, sustainable way to share files. Direct peer-to-peer transfers with bank-level encryption.',
    url: `${baseUrl}/about`,
    images: [
      {
        url: '/og-about.png',
        width: 1200,
        height: 630,
        alt: 'About Wizzit - Our Mission',
      },
    ],
  },
  twitter: {
    title: 'About Wizzit | P2P File Sharing Mission',
    description: 'Learn about Wizzit\'s mission to create a more private, sustainable way to share files. Direct peer-to-peer transfers with bank-level encryption.',
    images: ['/og-about.png'],
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 