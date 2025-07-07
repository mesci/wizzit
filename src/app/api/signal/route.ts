import { NextRequest, NextResponse } from 'next/server'
import { SignalingMessage } from '@/types'

// In-memory storage for demo purposes
// In production, you'd use Redis or a proper database
const signals = new Map<string, SignalingMessage[]>()

export async function POST(request: NextRequest) {
  try {
    const message: SignalingMessage = await request.json()
    
    if (!message.senderId || !message.receiverId || !message.type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Store the signal for the receiver
    const receiverSignals = signals.get(message.receiverId) || []
    receiverSignals.push(message)
    signals.set(message.receiverId, receiverSignals)

    // Clean up old signals (older than 1 hour)
    setTimeout(() => {
      const currentSignals = signals.get(message.receiverId) || []
      const filtered = currentSignals.filter(s => 
        Date.now() - new Date(s.data?.timestamp || 0).getTime() < 3600000
      )
      if (filtered.length > 0) {
        signals.set(message.receiverId, filtered)
      } else {
        signals.delete(message.receiverId)
      }
    }, 3600000)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Accept id via query param (?receiverId=xxx) or custom header (X-Transfer-Id) for flexibility
    let receiverId: string | null = searchParams.get('receiverId')

    if (!receiverId) {
      // Check lowercase header name first then canonical
      receiverId = request.headers.get('x-transfer-id') || request.headers.get('X-Transfer-Id')
    }

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Missing receiverId parameter' },
        { status: 400 }
      )
    }

    const receiverSignals = signals.get(receiverId) || []
    
    // Clear signals after sending them
    signals.delete(receiverId)

    return NextResponse.json({ signals: receiverSignals })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 