import { NextRequest, NextResponse } from 'next/server'
import { statsStore } from '@/lib/statsStore'

export async function GET() {
  const total = await statsStore.getTotal()
  return NextResponse.json({ total }, {
    headers: {
      // Cache at the edge for 60s, allow stale while revalidating
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { transferId } = await request.json()
    if (!transferId) {
      return NextResponse.json({ error: 'Missing transferId' }, { status: 400 })
    }
    const added = await statsStore.incrementIfFirst(transferId)
    return NextResponse.json({ success: true, counted: added })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 })
  }
}

