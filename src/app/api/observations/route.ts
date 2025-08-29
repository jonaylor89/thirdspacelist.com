import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  try {
    const body = await request.json()
    const {
      placeId,
      wifiSpeedDownload,
      wifiSpeedUpload,
      wifiLatency,
      noiseLevel,
      outletCount,
      crowdedness,
      notes
    } = body

    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    let userId = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) {
        userId = user.id
      }
    }

    // Validate required fields
    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      )
    }

    // Check if place exists
    const { data: place, error: placeError } = await supabase
      .from('places')
      .select('id')
      .eq('id', placeId)
      .single()

    if (placeError || !place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    // Insert observation
    const { data: observation, error } = await supabase
      .from('observations')
      .insert({
        place_id: placeId,
        user_id: userId,
        wifi_speed_download: wifiSpeedDownload || null,
        wifi_speed_upload: wifiSpeedUpload || null,
        wifi_latency: wifiLatency || null,
        noise_level: noiseLevel || null,
        outlet_count: outletCount || null,
        crowdedness: crowdedness || null,
        notes: notes || null,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating observation:', error)
      return NextResponse.json(
        { error: 'Failed to create observation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ observation }, { status: 201 })
  } catch (error) {
    console.error('Error processing observation:', error)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get('placeId')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    let query = supabase
      .from('observations')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (placeId) {
      query = query.eq('place_id', placeId)
    }

    const { data: observations, error } = await query

    if (error) throw error

    return NextResponse.json({
      observations: observations || [],
      total: observations?.length || 0
    })
  } catch (error) {
    console.error('Error fetching observations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch observations' },
      { status: 500 }
    )
  }
}
