import { createClient } from '@/lib/supabase/server'
import { typesenseClient } from '@/lib/typesense'

export interface Place {
  id: string
  name: string
  categories: string[]
  address?: string
  workability_score?: number
  distance_meters?: number
  wifi_available?: boolean
  outlets_available?: boolean
  place_lng?: number
  place_lat?: number
}

export interface FilterState {
  categories: string[]
  hasWifi: boolean
  hasOutlets: boolean
  minScore: number
  openNow: boolean
}

export async function fetchPlaces(
  currentLocation?: [number, number],
  filters: FilterState = {
    categories: [],
    hasWifi: false,
    hasOutlets: false,
    minScore: 0,
    openNow: false,
  }
): Promise<Place[]> {
  try {
    // Use Typesense for search if we have location or filters
    const useTypesense = currentLocation || 
                        filters.categories.length > 0 || 
                        filters.hasWifi || 
                        filters.hasOutlets || 
                        filters.minScore > 0

    if (useTypesense) {
      // Build filter conditions
      const filterConditions: string[] = []
      
      if (filters.categories.length > 0) {
        const categoryFilter = filters.categories.map(cat => `categories:=${cat}`).join(' || ')
        filterConditions.push(`(${categoryFilter})`)
      }
      
      if (filters.hasWifi) {
        filterConditions.push('wifi_available:=true')
      }
      
      if (filters.hasOutlets) {
        filterConditions.push('outlets_available:=true')
      }
      
      if (filters.minScore > 0) {
        filterConditions.push(`workability_score:>=${filters.minScore}`)
      }

      // Build search parameters
      const searchParams: any = {
        q: '*',
        query_by: 'name,searchable_text,categories',
        filter_by: filterConditions.length > 0 ? filterConditions.join(' && ') : undefined,
        sort_by: currentLocation ? `location(${currentLocation[1]}, ${currentLocation[0]}):asc` : 'workability_score:desc',
        page: 1,
        per_page: 100,
        facet_by: 'categories,wifi_available,outlets_available',
        max_facet_values: 20,
        num_typos: 2,
        prefix: true,
        drop_tokens_threshold: 1,
        typo_tokens_threshold: 1,
      }

      // Add geo-filtering if coordinates provided
      if (currentLocation) {
        const radiusMeters = 5 * 1000 // 5km in meters
        filterConditions.push(`location:(${currentLocation[1]}, ${currentLocation[0]}, ${radiusMeters} m)`)
        searchParams.filter_by = filterConditions.join(' && ')
      }

      const searchResult = await typesenseClient
        .collections('places')
        .documents()
        .search(searchParams)

      // Transform results to match expected format
      const places = searchResult.hits?.map((hit: any) => ({
        id: hit.document.id,
        name: hit.document.name,
        categories: hit.document.categories,
        address: hit.document.address,
        workability_score: hit.document.workability_score,
        wifi_available: hit.document.wifi_available,
        outlets_available: hit.document.outlets_available,
        place_lat: hit.document.location[0],
        place_lng: hit.document.location[1],
        // Add distance if geo-search was performed
        ...(currentLocation && hit.geo_distance_meters && {
          distance_meters: hit.geo_distance_meters.location
        }),
      })) || []

      console.log(`Found ${searchResult.found} places via Typesense search`)
      return places
    } else {
      // Fallback to direct Supabase API for simple queries
      const supabase = await createClient()
      
      if (currentLocation) {
        const [lng, lat] = currentLocation
        const { data: nearbyPlaces, error } = await (supabase as any)
          .rpc('nearby_places', {
            lat,
            lng,
            radius_meters: 5000 // 5km
          })
        
        if (error) throw error

        // Apply additional filters
        let filteredPlaces = nearbyPlaces || []

        if (filters.categories.length > 0) {
          filteredPlaces = filteredPlaces.filter((place: any) =>
            place.categories.some((cat: string) => filters.categories.includes(cat))
          )
        }

        if (filters.hasWifi) {
          const placeIds = filteredPlaces.map((p: any) => p.id)
          const { data: wifiPlaces } = await supabase
            .from('places')
            .select('id')
            .in('id', placeIds)
            .or('wifi_available.eq.true,id.in.(select place_id from observations where wifi_speed_download > 0)')

          const wifiPlaceIds = new Set(wifiPlaces?.map((p: any) => p.id))
          filteredPlaces = filteredPlaces.filter((place: any) => wifiPlaceIds.has(place.id))
        }

        if (filters.hasOutlets) {
          const placeIds = filteredPlaces.map((p: any) => p.id)
          const { data: outletPlaces } = await supabase
            .from('places')
            .select('id')
            .in('id', placeIds)
            .or('outlets_available.eq.true,id.in.(select place_id from observations where outlet_count > 0)')

          const outletPlaceIds = new Set(outletPlaces?.map((p: any) => p.id))
          filteredPlaces = filteredPlaces.filter((place: any) => outletPlaceIds.has(place.id))
        }

        if (filters.minScore > 0) {
          filteredPlaces = filteredPlaces.filter((place: any) => 
            place.workability_score !== null && place.workability_score >= filters.minScore
          )
        }

        return filteredPlaces.slice(0, 100)
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
          place_lat,
          place_lng,
          created_at
        `)
        .order('workability_score', { ascending: false, nullsFirst: false })
        .limit(100)

      if (filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories)
      }

      if (filters.hasWifi) {
        query = query.eq('wifi_available', true)
      }

      if (filters.hasOutlets) {
        query = query.eq('outlets_available', true)
      }

      if (filters.minScore > 0) {
        query = query.gte('workability_score', filters.minScore)
      }

      const { data: places, error } = await query

      if (error) throw error

      return places || []
    }
  } catch (error) {
    console.error('Error fetching places:', error)
    return []
  }
}