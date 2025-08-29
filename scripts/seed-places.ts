import { createAdminClient } from '../src/lib/supabase/server'

const supabaseAdmin = createAdminClient()

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  tags?: {
    name?: string
    amenity?: string
    leisure?: string
    shop?: string
    'addr:full'?: string
    'addr:street'?: string
    'addr:housenumber'?: string
    'addr:city'?: string
    website?: string
    phone?: string
    'opening_hours'?: string
    wifi?: string
    'socket:type'?: string
    [key: string]: string | undefined
  }
  center?: {
    lat: number
    lon: number
  }
}

interface OverpassResponse {
  version: number
  generator: string
  elements: OverpassElement[]
}

const OVERPASS_QUERY = `
[out:json][timeout:60];
(
  // Cafes
  node["amenity"="cafe"](40.6,-74.1,40.85,-73.7);
  way["amenity"="cafe"](40.6,-74.1,40.85,-73.7);
  
  // Libraries
  node["amenity"="library"](40.6,-74.1,40.85,-73.7);
  way["amenity"="library"](40.6,-74.1,40.85,-73.7);
  
  // Coworking spaces
  node["office"="coworking"](40.6,-74.1,40.85,-73.7);
  way["office"="coworking"](40.6,-74.1,40.85,-73.7);
  node["amenity"="coworking_space"](40.6,-74.1,40.85,-73.7);
  way["amenity"="coworking_space"](40.6,-74.1,40.85,-73.7);
  
  // Fast food with seating
  node["amenity"="fast_food"]["indoor_seating"="yes"](40.6,-74.1,40.85,-73.7);
  way["amenity"="fast_food"]["indoor_seating"="yes"](40.6,-74.1,40.85,-73.7);
  
  // Restaurants with wifi
  node["amenity"="restaurant"]["wifi"="yes"](40.6,-74.1,40.85,-73.7);
  way["amenity"="restaurant"]["wifi"="yes"](40.6,-74.1,40.85,-73.7);
  
  // Bookstores
  node["shop"="books"](40.6,-74.1,40.85,-73.7);
  way["shop"="books"](40.6,-74.1,40.85,-73.7);
);
out center meta;
`

function categorizePlace(tags: OverpassElement['tags'] = {}): string[] {
  const categories: string[] = []
  
  if (tags.amenity === 'cafe') categories.push('cafe')
  if (tags.amenity === 'library') categories.push('library')
  if (tags.office === 'coworking' || tags.amenity === 'coworking_space') {
    categories.push('coworking')
  }
  if (tags.amenity === 'fast_food') categories.push('fast_food')
  if (tags.amenity === 'restaurant') categories.push('restaurant')
  if (tags.shop === 'books') categories.push('bookstore')
  
  return categories.length > 0 ? categories : ['other']
}

function buildAddress(tags: OverpassElement['tags'] = {}): string | null {
  if (tags['addr:full']) return tags['addr:full']
  
  const parts: string[] = []
  if (tags['addr:housenumber'] && tags['addr:street']) {
    parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`)
  }
  if (tags['addr:city']) {
    parts.push(tags['addr:city'])
  }
  
  return parts.length > 0 ? parts.join(', ') : null
}

async function fetchOverpassData(): Promise<OverpassResponse> {
  console.log('Fetching data from Overpass API...')
  
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
  })

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`)
  }

  return response.json()
}

async function insertPlaces(elements: OverpassElement[]) {
  console.log(`Processing ${elements.length} places...`)
  
  const places = elements
    .filter(element => element.tags?.name) // Only places with names
    .map(element => {
      const lat = element.lat ?? element.center?.lat
      const lon = element.lon ?? element.center?.lon
      
      if (!lat || !lon) return null
      
      return {
        osm_id: `${element.type}/${element.id}`,
        name: element.tags!.name!,
        categories: categorizePlace(element.tags),
        location: `POINT(${lon} ${lat})`,
        address: buildAddress(element.tags),
        website: element.tags?.website || null,
        phone: element.tags?.phone || null,
        opening_hours: element.tags?.['opening_hours'] || null,
        wifi_available: element.tags?.wifi === 'yes' || null,
        outlets_available: Boolean(element.tags?.['socket:type']) || null,
      }
    })
    .filter(place => place !== null)

  console.log(`Inserting ${places.length} valid places...`)

  // Insert places one by one to handle potential duplicates
  let insertedCount = 0
  let skippedCount = 0

  for (const place of places) {
    try {
      // Check if place already exists
      const { data: existing } = await supabaseAdmin
        .from('places')
        .select('id')
        .eq('osm_id', place.osm_id)
        .single()

      if (!existing) {
        const { error } = await supabaseAdmin
          .from('places')
          .insert(place as any) // Type assertion to bypass strict typing
        
        if (error) {
          console.warn(`Failed to insert place ${place.name}:`, error.message)
        } else {
          insertedCount++
        }
      } else {
        skippedCount++
      }
    } catch (error) {
      console.warn(`Error processing place ${place.name}:`, error)
    }
  }

  console.log(`Successfully inserted ${insertedCount} places, skipped ${skippedCount} duplicates`)
  return { insertedCount, skippedCount }
}

async function main() {
  try {
    console.log('Starting NYC data seeding...')
    
    const data = await fetchOverpassData()
    console.log(`Retrieved ${data.elements.length} elements from Overpass`)
    
    await insertPlaces(data.elements)
    
    console.log('✅ Data seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { main as seedPlaces }
