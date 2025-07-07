// Configuration for dynamic base URL
export function getBaseUrl(): string {
  // Priority order for base URL detection:
  // 1. Environment variable (for custom deployments)
  // 2. Vercel URL (for preview deployments)  
  // 3. Current window location (for client-side)
  // 4. Default fallback
  
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin
  }
  
  // Server-side: check environment variables
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Default fallback for development
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://wizzit.org'
}

// Get the base URL for metadata (server-side only)
export function getMetadataBaseUrl(): string {
  // Priority: 
  // 1. Custom domain (NEXT_PUBLIC_BASE_URL)
  // 2. Production domain (VERCEL_PROJECT_PRODUCTION_URL) 
  // 3. Default fallback
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  
  // Use production URL instead of preview URL for sitemap/robots
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  
  // Only use VERCEL_URL as last resort (for initial deployments)
  if (process.env.VERCEL_URL && !process.env.VERCEL_URL.includes('vercel.app')) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  return 'https://wizzit.org'
} 