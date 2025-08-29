import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '5000' // 5km default
  const categories = searchParams.get('categories')?.split(',')
  const hasWifi = searchParams.get('wifi') === 'true'
  const hasOutlets = searchParams.get('outlets') === 'true'
  const minScore = searchParams.get('minScore')

  try {
    // If lat/lng provided, use nearby search
    if (lat && lng) {
      const { data: nearbyPlaces, error } = await (supabase as any)
        .rpc('nearby_places', {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius_meters: parseInt(radius)
        })
      
      if (error) throw error

      // Apply additional filters
      let filteredPlaces = nearbyPlaces || []

      if (categories && categories.length > 0) {
        filteredPlaces = filteredPlaces.filter((place: any) =>
          place.categories.some((cat: string) => categories.includes(cat))
        )
      }

      if (hasWifi) {
        // Get places with wifi observations or wifi_available = true
        const placeIds = filteredPlaces.map((p: any) => p.id)
        const { data: wifiPlaces } = await supabase
          .from('places')
          .select('id')
          .in('id', placeIds)
          .or('wifi_available.eq.true,id.in.(select place_id from observations where wifi_speed_download > 0)')

        const wifiPlaceIds = new Set(wifiPlaces?.map((p: any) => p.id))
        filteredPlaces = filteredPlaces.filter((place: any) => wifiPlaceIds.has(place.id))
      }

      if (hasOutlets) {
        const placeIds = filteredPlaces.map((p: any) => p.id)
        const { data: outletPlaces } = await supabase
          .from('places')
          .select('id')
          .in('id', placeIds)
          .or('outlets_available.eq.true,id.in.(select place_id from observations where outlet_count > 0)')

        const outletPlaceIds = new Set(outletPlaces?.map((p: any) => p.id))
        filteredPlaces = filteredPlaces.filter((place: any) => outletPlaceIds.has(place.id))
      }

      if (minScore) {
        const minScoreNum = parseFloat(minScore)
        filteredPlaces = filteredPlaces.filter((place: any) => 
          place.workability_score !== null && place.workability_score >= minScoreNum
        )
      }

      console.log(`fetched`, {
        filteredPlaces: filteredPlaces.length,
        nearbyPlaces: nearbyPlaces.length,
      });

      return NextResponse.json({
        places: filteredPlaces.slice(0, 100), // Limit results
        total: filteredPlaces.length
      })
    }

    // General search without location
    let query = supabase
      .from('places')
      .select(`
        id,
        name,
        categories,
        address,
        workability_score,
        wifi_available,
        outlets_available,
        created_at
      `)
      .order('workability_score', { ascending: false, nullsFirst: false })
      .limit(100)

    if (categories && categories.length > 0) {
      query = query.overlaps('categories', categories)
    }

    if (hasWifi) {
      query = query.eq('wifi_available', true)
    }

    if (hasOutlets) {
      query = query.eq('outlets_available', true)
    }

    if (minScore) {
      query = query.gte('workability_score', parseFloat(minScore))
    }

    const { data: places, error } = await query

    if (error) throw error

    return NextResponse.json({
      places: places || [],
      total: places?.length || 0
    })
  } catch (error) {
    console.error('Error fetching places:', error)
    return NextResponse.json(
      { error: 'Failed to fetch places' },
      { status: 500 }
    )
  }
}
