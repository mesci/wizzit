import { Metadata } from 'next'
import { getMetadataBaseUrl } from '@/lib/config'
import { logger } from '@/lib/logger'

type Props = {
  params: Promise<{ data: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: shortId } = await params
  const baseUrl = getMetadataBaseUrl()
  
  // Try to fetch file info for dynamic metadata
  try {
    const response = await fetch(`${baseUrl}/api/share?id=${shortId}`)
    
    if (response.ok) {
      const transferData = await response.json()
      const fileName = transferData.fileName || 'Unknown File'
      const fileSize = transferData.fileSize ? formatFileSize(transferData.fileSize) : 'Unknown Size'
      
      return {
        title: `Download ${fileName} | Wizzit P2P File Transfer`,
        description: `Someone shared "${fileName}" (${fileSize}) with you via Wizzit. Click to download this file directly and securely through peer-to-peer transfer.`,
        openGraph: {
          title: `Download ${fileName}`,
          description: `Someone shared "${fileName}" (${fileSize}) with you via Wizzit. Secure P2P file transfer.`,
          url: `${baseUrl}/s/${shortId}`,
          images: [
            {
              url: '/og-share.png',
              width: 1200,
              height: 630,
              alt: `Download ${fileName} via Wizzit`,
            },
          ],
        },
        twitter: {
          title: `Download ${fileName}`,
          description: `Someone shared "${fileName}" (${fileSize}) with you via Wizzit. Secure P2P file transfer.`,
          images: ['/og-share.png'],
        },
      }
    }
  } catch (error) {
    logger.error('Failed to fetch transfer data for metadata:', error)
  }
  
  // Fallback metadata if fetch fails
  return {
    title: 'Download File | Wizzit P2P File Transfer',
    description: 'Someone shared a file with you via Wizzit. Click to download this file directly and securely through peer-to-peer transfer.',
    openGraph: {
      title: 'Download File via Wizzit',
      description: 'Someone shared a file with you via Wizzit. Secure P2P file transfer.',
      url: `${baseUrl}/s/${shortId}`,
      images: [
        {
          url: '/og-share.png',
          width: 1200,
          height: 630,
          alt: 'Download File via Wizzit',
        },
      ],
    },
    twitter: {
      title: 'Download File via Wizzit',
      description: 'Someone shared a file with you via Wizzit. Secure P2P file transfer.',
      images: ['/og-share.png'],
    },
  }
}

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 