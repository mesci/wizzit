import { Metadata } from 'next'
import { getMetadataBaseUrl } from '@/lib/config'

const baseUrl = getMetadataBaseUrl()

export const metadata: Metadata = {
  title: 'Legal | Privacy Policy & Terms | Wizzit',
  description: 'Read Wizzit\'s privacy policy, terms of service, and legal framework. Learn about our commitment to privacy, DMCA policy, and how we protect your data in P2P file transfers.',
  keywords: 'wizzit privacy policy, terms of service, legal framework, DMCA policy, data protection, p2p file transfer legal, privacy rights',
  openGraph: {
    title: 'Legal Information | Privacy Policy & Terms of Service',
    description: 'Read Wizzit\'s privacy policy, terms of service, and legal framework. Learn about our commitment to privacy and data protection.',
    url: `${baseUrl}/legal`,
    images: [
      {
        url: '/og-legal.png',
        width: 1200,
        height: 630,
        alt: 'Wizzit Legal Information',
      },
    ],
  },
  twitter: {
    title: 'Legal Information | Privacy Policy & Terms of Service',
    description: 'Read Wizzit\'s privacy policy, terms of service, and legal framework. Learn about our commitment to privacy and data protection.',
    images: ['/og-legal.png'],
  },
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 