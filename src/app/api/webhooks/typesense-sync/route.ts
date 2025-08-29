import { NextRequest, NextResponse } from 'next/server'
import { syncSinglePlace, deletePlaceFromTypesense } from '@/lib/typesense-sync'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Verify webhook signature if needed (recommended for production)
    // const signature = request.headers.get('x-supabase-signature')
    
    console.log('Webhook received:', payload.type, payload.table)
    
    if (payload.table !== 'places') {
      return NextResponse.json({ message: 'Not a places table event' }, { status: 200 })
    }

    const placeId = payload.record?.id || payload.old_record?.id
    
    if (!placeId) {
      console.error('No place ID found in webhook payload')
      return NextResponse.json({ error: 'No place ID found' }, { status: 400 })
    }

    let result
    
    switch (payload.type) {
      case 'INSERT':
      case 'UPDATE':
        console.log(`Syncing ${payload.type.toLowerCase()}d place:`, placeId)
        result = await syncSinglePlace(placeId)
        break
        
      case 'DELETE':
        console.log('Deleting place:', placeId)
        await deletePlaceFromTypesense(placeId)
        result = { action: 'deleted', placeId }
        break
        
      default:
        console.log('Unknown webhook type:', payload.type)
        return NextResponse.json({ message: 'Unknown event type' }, { status: 200 })
    }

    console.log('Webhook processed successfully:', result)
    
    return NextResponse.json({ 
      success: true, 
      action: result.action,
      placeId 
    })
    
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'typesense-sync',
    timestamp: new Date().toISOString()
  })
}
