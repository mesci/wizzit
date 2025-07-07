import { NextRequest, NextResponse } from 'next/server'

// In-memory store for transfer data. Persist on globalThis to survive hot reloads in dev.
const globalAny = global as any
const transferStore: Map<string, {
  transferId: string
  offer: string
  fileName: string
  fileSize: number
  senderHasVpn?: boolean
  createdAt: number
}> = globalAny.__transferStore || new Map()

if (!globalAny.__transferStore) {
  globalAny.__transferStore = transferStore
}

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
    
    // Store transfer data
    transferStore.set(shortId, {
      ...transferData,
      createdAt: Date.now()
    })
    
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
    
    const transferData = transferStore.get(shortId)
    
    if (!transferData) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
    }
    
    // Check if transfer has expired (15 minutes)
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
    
    return NextResponse.json(transferData)
    
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve transfer data' }, { status: 500 })
  }
} 