import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    // Get place details
    const { data: place, error: placeError } = await supabase
      .from('places')
      .select(`
        *,
        observations (
          id,
          wifi_speed_download,
          wifi_speed_upload,
          wifi_latency,
          noise_level,
          outlet_count,
          crowdedness,
          notes,
          created_at,
          profiles (
            full_name
          )
        )
      `)
      .eq('id', id)
      .single()

    if (placeError || !place) {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    // Calculate recent statistics
    const recentObservations = (place as any).observations?.filter(
      (obs: any) => new Date(obs.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ) || []

    const stats = {
      totalObservations: (place as any).observations?.length || 0,
      recentObservations: recentObservations.length,
      avgWifiSpeed: recentObservations.length > 0 
        ? recentObservations
            .filter((obs: any) => obs.wifi_speed_download)
            .reduce((sum: number, obs: any) => sum + obs.wifi_speed_download, 0) / 
          recentObservations.filter((obs: any) => obs.wifi_speed_download).length
        : null,
      avgNoiseLevel: recentObservations.length > 0
        ? recentObservations
            .filter((obs: any) => obs.noise_level)
            .reduce((sum: number, obs: any) => sum + obs.noise_level, 0) /
          recentObservations.filter((obs: any) => obs.noise_level).length
        : null,
      avgCrowdedness: recentObservations.length > 0
        ? recentObservations
            .filter((obs: any) => obs.crowdedness)
            .reduce((sum: number, obs: any) => sum + obs.crowdedness, 0) /
          recentObservations.filter((obs: any) => obs.crowdedness).length
        : null,
    }

    return NextResponse.json({
      place,
      stats,
      recentObservations: recentObservations.slice(0, 10) // Latest 10
    })
  } catch (error) {
    console.error('Error fetching place:', error)
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    )
  }
}
