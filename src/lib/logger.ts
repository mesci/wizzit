// Development-only logger
// In production, all console statements are silenced for performance and clean logs

const isDevelopment = (() => {
  try {
    // Check multiple indicators for development mode
    return process.env.NODE_ENV === 'development' || 
           process.env.NEXT_PUBLIC_VERCEL_ENV === 'development' ||
           (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  } catch {
    return false // Safe fallback for production
  }
})()

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args)
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  }
}

// For backwards compatibility, you can also use:
export const devLog = logger.log
export const devError = logger.error
export const devWarn = logger.warn 