import { MetadataRoute } from 'next'
import { getMetadataBaseUrl } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getMetadataBaseUrl()
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
} 