import { NextRequest, NextResponse } from 'next/server'
import { UpstashKV } from '@/lib/kv'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// In-memory store for transfer data. Persist on globalThis to survive hot reloads in dev.
const globalAny = global as any
const transferStore: Map<string, {
  transferId: string
  offer: string
  fileName: string
  fileSize: number
  senderHasVpn?: boolean
  createdAt: number
  pinHash?: string
  firstAccessedAt?: number
}> = globalAny.__transferStore || new Map()

if (!globalAny.__transferStore) {
  globalAny.__transferStore = transferStore
}

// KV with TTL (15 minutes) – keeps links consistent across instances
const KV_TTL_SECONDS = 15 * 60
const kv = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new UpstashKV(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
  : null
const kvKey = (id: string) => `wizzit:share:${id}`

// Generate short ID
const generateShortId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Clean up expired transfers (15 minutes)
const cleanupExpiredTransfers = () => {
  const now = Date.now()
  const EXPIRY_TIME = 15 * 60 * 1000 // 15 minutes in milliseconds
  let cleanedCount = 0
  
  for (const [shortId, data] of transferStore.entries()) {
    if (now - data.createdAt > EXPIRY_TIME) {
      transferStore.delete(shortId)
      cleanedCount++
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Clean up expired transfers on each POST
    cleanupExpiredTransfers()
    
    const transferData = await request.json()
    
    // Validate required fields
    if (!transferData.transferId || !transferData.offer || !transferData.fileName || !transferData.fileSize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Generate unique short ID
    let shortId = generateShortId()
    let attempts = 0
    while (transferStore.has(shortId)) {
      attempts++
      shortId = generateShortId()
      if (attempts > 10) {
        return NextResponse.json({ error: 'Failed to generate unique ID' }, { status: 500 })
      }
    }
    
    // Store transfer data (pinHash optional)
    const payload = {
      ...transferData,
      createdAt: Date.now()
    }
    transferStore.set(shortId, payload)
    if (kv) {
      try { await kv.setWithTTL(kvKey(shortId), JSON.stringify(payload), KV_TTL_SECONDS) } catch {}
    }
    
    return NextResponse.json({ shortId })
    
  } catch {
    return NextResponse.json({ error: 'Failed to store transfer data' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const shortId = url.searchParams.get('id')
    
    if (!shortId) {
      return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 })
    }
    
    let transferData = transferStore.get(shortId) as {
      transferId: string
      offer: string
      fileName: string
      fileSize: number
      senderHasVpn?: boolean
      createdAt: number
      pinHash?: string
      firstAccessedAt?: number
    } | undefined
    if (!transferData && kv) {
      try {
        const raw = await kv.get(kvKey(shortId))
        if (raw) {
          const parsed = JSON.parse(raw) as {
            transferId: string
            offer: string
            fileName: string
            fileSize: number
            senderHasVpn?: boolean
            createdAt: number
            pinHash?: string
            firstAccessedAt?: number
          }
          transferData = parsed
          transferStore.set(shortId, parsed)
        }
      } catch {}
    }
    
    if (!transferData) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }
    
    // Check if transfer has expired. (15 minutes)
    const now = Date.now()
    const EXPIRY_TIME = 15 * 60 * 1000 // 15 minutes in milliseconds
    const age = now - transferData.createdAt
    
    if (age > EXPIRY_TIME) {
      // Remove expired transfer
      transferStore.delete(shortId)
      return NextResponse.json({ 
        error: 'This share link has expired. Links are valid for 15 minutes.' 
      }, { status: 404 })
    }
    // Mark first access time (allows sender UI to detect that receiver opened the link)
    if (!transferData.firstAccessedAt) {
      const updated = { ...transferData!, firstAccessedAt: Date.now() }
      transferStore.set(shortId, updated)
      transferData = updated
    }
    return NextResponse.json(transferData as any, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve transfer data' }, { status: 500 })
  }
} 

// Optional: update transfer metadata (e.g., set or clear pinHash) by short id
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, pinHash } = body || {}
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    let existing = transferStore.get(id)
    if (!existing && kv) {
      try {
        const raw = await kv.get(kvKey(id))
        if (raw) existing = JSON.parse(raw)
      } catch {}
    }
    if (!existing) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }
    if (typeof pinHash === 'string') {
      existing.pinHash = pinHash
    } else if (pinHash === null) {
      delete existing.pinHash
    }
    transferStore.set(id, existing)
    if (kv) {
      try { await kv.setWithTTL(kvKey(id), JSON.stringify(existing), KV_TTL_SECONDS) } catch {}
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 })
  }
}