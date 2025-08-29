import { typesenseClient, initializeTypesenseCollection } from './typesense'
import { createAdminClient } from './supabase/server'

interface SupabasePlace {
  id: string
  name: string
  categories: string[]
  address: string | null
  workability_score: number | null
  wifi_available: boolean | null
  outlets_available: boolean | null
  location: any // PostGIS geography
  created_at: string
  updated_at: string
}

interface TypesensePlace {
  id: string
  name: string
  categories: string[]
  address?: string
  workability_score?: number
  wifi_available?: boolean
  outlets_available?: boolean
  location: [number, number] // [lat, lng]
  created_at: number
  updated_at: number
  searchable_text: string
}

// Convert PostGIS location to Typesense geopoint format
function extractLocationFromPostGIS(location: any): [number, number] {
  // PostGIS geography is stored as WKB, we need to extract lat/lng
  // For now, we'll get coordinates from the raw query result
  // This will be populated by the SQL query that extracts ST_X and ST_Y
  return [0, 0] // Placeholder - will be overridden by SQL query
}

// Convert Supabase place to Typesense format
function convertToTypesenseFormat(place: SupabasePlace, lat: number, lng: number): TypesensePlace {
  const searchableText = [
    place.name,
    place.address,
    ...place.categories,
  ].filter(Boolean).join(' ').toLowerCase()

  return {
    id: place.id,
    name: place.name,
    categories: place.categories,
    ...(place.address && { address: place.address }),
    ...(place.workability_score !== null && { workability_score: place.workability_score }),
    ...(place.wifi_available !== null && { wifi_available: place.wifi_available }),
    ...(place.outlets_available !== null && { outlets_available: place.outlets_available }),
    location: [lat, lng],
    created_at: new Date(place.created_at).getTime(),
    updated_at: new Date(place.updated_at).getTime(),
    searchable_text: searchableText,
  }
}

// Sync all places from Supabase to Typesense
export async function syncAllPlaces() {
  console.log('Starting full sync of places to Typesense...')
  
  try {
    await initializeTypesenseCollection()
    
    const supabase = createAdminClient()
    
    // Get all places with coordinates extracted from PostGIS
    const { data: places, error } = await supabase
      .from('places_with_coords')
      .select(`
        id,
        name,
        categories,
        address,
        workability_score,
        wifi_available,
        outlets_available,
        created_at,
        updated_at,
        lat,
        lng
      `) as { data: any[] | null, error: any }

    if (error) {
      console.error('Error fetching places from Supabase:', error)
      throw error
    }

    if (!places || places.length === 0) {
      console.log('No places found in Supabase')
      return { synced: 0 }
    }

    console.log(`Found ${places.length} places to sync`)

    // Convert to Typesense format
    const typesenseDocuments = places.map((place: any) =>
      convertToTypesenseFormat(place, place.lat, place.lng)
    )

    // Clear existing documents and import new ones
    try {
      await typesenseClient.collections('places').documents().delete({
        filter_by: 'id:!=null'
      })
    } catch (error: any) {
      // Ignore if no documents exist
      if (error.httpStatus !== 404) {
        console.warn('Error clearing existing documents:', error)
      }
    }

    // Import documents in batches
    const batchSize = 100
    let syncedCount = 0
    
    for (let i = 0; i < typesenseDocuments.length; i += batchSize) {
      const batch = typesenseDocuments.slice(i, i + batchSize)
      
      try {
        const importResult = await typesenseClient
          .collections('places')
          .documents()
          .import(batch, { action: 'create' })
        
        // Check for any import errors
        const errors = importResult.filter((result: any) => !result.success)
        if (errors.length > 0) {
          console.error(`Batch ${i / batchSize + 1} errors:`, errors)
        }
        
        syncedCount += batch.length - errors.length
        console.log(`Synced batch ${i / batchSize + 1}/${Math.ceil(typesenseDocuments.length / batchSize)}`)
      } catch (error) {
        console.error(`Error importing batch ${i / batchSize + 1}:`, error)
        throw error
      }
    }

    console.log(`✅ Successfully synced ${syncedCount}/${places.length} places to Typesense`)
    return { synced: syncedCount }
    
  } catch (error) {
    console.error('❌ Error during full sync:', error)
    throw error
  }
}

// Sync a single place
export async function syncSinglePlace(placeId: string) {
  console.log(`Syncing place ${placeId} to Typesense...`)
  
  try {
    const supabase = createAdminClient()
    
    const { data: place, error } = await supabase
      .from('places')
      .select(`
        id,
        name,
        categories,
        address,
        workability_score,
        wifi_available,
        outlets_available,
        created_at,
        updated_at,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng
      `)
      .eq('id', placeId)
      .single() as { data: any | null, error: any }

    if (error) {
      console.error(`Error fetching place ${placeId}:`, error)
      throw error
    }

    if (!place) {
      // Place was deleted, remove from Typesense
      try {
        await typesenseClient.collections('places').documents(placeId).delete()
        console.log(`✅ Removed place ${placeId} from Typesense`)
      } catch (error: any) {
        if (error.httpStatus !== 404) {
          console.error(`Error removing place ${placeId}:`, error)
        }
      }
      return { action: 'deleted' }
    }

    // Convert and upsert to Typesense
    const typesenseDoc = convertToTypesenseFormat(place, place.lat, place.lng)
    
    await typesenseClient
      .collections('places')
      .documents()
      .upsert(typesenseDoc)
    
    console.log(`✅ Synced place ${placeId} to Typesense`)
    return { action: 'upserted', document: typesenseDoc }
    
  } catch (error) {
    console.error(`❌ Error syncing place ${placeId}:`, error)
    throw error
  }
}

// Delete a place from Typesense
export async function deletePlaceFromTypesense(placeId: string) {
  try {
    await typesenseClient.collections('places').documents(placeId).delete()
    console.log(`✅ Deleted place ${placeId} from Typesense`)
  } catch (error: any) {
    if (error.httpStatus === 404) {
      console.log(`Place ${placeId} not found in Typesense`)
    } else {
      console.error(`Error deleting place ${placeId} from Typesense:`, error)
      throw error
    }
  }
}
