import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { getMetadataBaseUrl } from '@/lib/config'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const baseUrl = getMetadataBaseUrl()

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Wizzit - Secure P2P File Transfer',
  description: 'Transfer files directly between devices with peer-to-peer technology. No server storage, bank-level encryption. Share large files privately and securely.',
  keywords: 'peer to peer file transfer, P2P file sharing, secure file transfer, direct file sharing, WebRTC file transfer, no server file sharing, private file transfer, encrypted file sharing, large file transfer, instant file sharing',
  authors: [{ name: 'Wizzit Team' }],
  creator: 'Wizzit',
  publisher: 'Wizzit',
  category: 'Technology',
  applicationName: 'Wizzit',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Wizzit - Secure P2P File Transfer',
    description: 'Transfer files directly between devices with peer-to-peer technology. No server storage, bank-level encryption.',
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Wizzit',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Wizzit - Secure P2P File Transfer',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@wizzitorg',
    creator: '@wizzitorg',
    title: 'Wizzit - Secure P2P File Transfer',
    description: 'Transfer files directly between devices with peer-to-peer technology. No server storage, bank-level encryption.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  themeColor: '#ffffff',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Wizzit',
    description: 'Transfer files directly between devices with peer-to-peer technology. No server storage, bank-level encryption keeps your files private.',
    url: baseUrl,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'Wizzit',
    },
    featureList: [
      'Peer-to-peer file transfer',
      'End-to-end encryption',
      'No server storage',
      'Direct browser-to-browser transfers',
      'Bank-level security',
      'No file size limits',
      'Real-time transfers'
    ],
    browserRequirements: 'Requires JavaScript and WebRTC support',
    softwareVersion: '1.0.0',
  }

  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} h-full bg-background text-foreground antialiased`}>
        <div className="min-h-full">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  )
} 