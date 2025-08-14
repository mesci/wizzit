import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

// Time-limited credentials configuration
const CREDENTIAL_TTL = 2 * 60 * 60 // 2 hours in seconds (balanced security vs usability)
const TURN_SECRET = process.env.TURN_SECRET

if (!TURN_SECRET) {
  throw new Error('TURN_SECRET env variable is not set')
}

// Safe non-null secret for crypto operations
const TURN_SECRET_KEY: string = TURN_SECRET

function generateTurnCredentials() {
  // Generate timestamp-based username (valid for TTL seconds)
  const timestamp = Math.floor(Date.now() / 1000) + CREDENTIAL_TTL
  const username = `${timestamp}:wizzit-user`
  
  // Generate HMAC-based password using shared secret
  const hmac = crypto.createHmac('sha1', TURN_SECRET_KEY)
  hmac.update(username)
  const credential = hmac.digest('base64')
  
  return { username, credential, expiresAt: timestamp }
}

export async function GET(request: NextRequest) {
  try {
    // Generate time-limited TURN credentials
    const turnCredentials = generateTurnCredentials()
    
    // Detect potential VPN/WARP usage from headers
    const userAgent = request.headers.get('user-agent') || ''
    const cfRay = request.headers.get('cf-ray')
    const cfIpcountry = request.headers.get('cf-ipcountry')
    const isWarp = cfRay && userAgent.includes('CFNetwork')
    
    logger.log('🌐 ICE servers request:', { userAgent: userAgent.substring(0, 50), cfRay, cfIpcountry, isWarp })
    
    const iceServers = [
      // Google STUN servers (primary for direct P2P)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Our STUN server
      { urls: `stun:${process.env.STUN_SERVER}:3478` },
      // TURN server UDP on 443 (often allowed on restrictive networks)
      {
        urls: `turn:${process.env.TURN_SERVER}:443?transport=udp`,
        username: turnCredentials.username,
        credential: turnCredentials.credential
      },
      // TURN server UDP (standard 3478)
      {
        urls: `turn:${process.env.TURN_SERVER}:3478?transport=udp`,
        username: turnCredentials.username,
        credential: turnCredentials.credential
      },
      // TURN server TCP (fallback – prefer after UDP options)
      {
        urls: `turn:${process.env.TURN_SERVER}:3478?transport=tcp`,
        username: turnCredentials.username,
        credential: turnCredentials.credential
      },
      // Additional TURN servers for WARP/VPN scenarios
      ...(isWarp ? [
        {
          urls: `turns:${process.env.TURN_SERVER}:5349?transport=tcp`,
          username: turnCredentials.username,
          credential: turnCredentials.credential
        }
      ] : [])
    ]

    // Filter out any servers with missing configuration
    const validServers = iceServers.filter(server => {
      try {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
        for (const u of urls) {
          if (u.startsWith('turn:')) {
            if (!process.env.TURN_SERVER || !('username' in server) || !('credential' in server)) return false
          }
          if (u.startsWith('stun:') && u.includes(':') && u.includes(process.env.STUN_SERVER || '')) {
            if (!process.env.STUN_SERVER) return false
          }
        }
        return true
      } catch { return false }
    })

    return NextResponse.json({ 
      iceServers: validServers,
      success: true,
      credentialsExpiresAt: turnCredentials.expiresAt,
      ttl: CREDENTIAL_TTL,
      isWarp
    })
  } catch (error) {
    logger.error('ICE servers error:', error)
    
    // Fallback to basic STUN servers if TURN configuration fails
    const fallbackServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
    
    return NextResponse.json({ 
      iceServers: fallbackServers,
      success: false,
      error: 'TURN server configuration failed - using STUN only'
    })
  }
} 