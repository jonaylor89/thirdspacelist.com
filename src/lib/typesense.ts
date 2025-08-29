import Typesense from 'typesense'

const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'dev-api-key-123',
  connectionTimeoutSeconds: 2,
})

// Collection schema for places
export const placesSchema = {
  name: 'places',
  fields: [
    { name: 'id', type: 'string' as const },
    { name: 'name', type: 'string' as const, facet: false, sort: true },
    { name: 'categories', type: 'string[]' as const, facet: true },
    { name: 'address', type: 'string' as const, optional: true, facet: false },
    { name: 'workability_score', type: 'float' as const, optional: true, facet: true, sort: true },
    { name: 'wifi_available', type: 'bool' as const, optional: true, facet: true },
    { name: 'outlets_available', type: 'bool' as const, optional: true, facet: true },
    { name: 'location', type: 'geopoint' as const },
    { name: 'created_at', type: 'int64' as const, sort: true },
    { name: 'updated_at', type: 'int64' as const, sort: true },
    // Search-optimized fields
    { name: 'searchable_text', type: 'string' as const }, // Combined searchable content
  ],
  default_sorting_field: 'created_at', // Use non-optional field for default sorting
}

// Initialize collection if it doesn't exist
export async function initializeTypesenseCollection() {
  try {
    // Check if collection exists
    await client.collections('places').retrieve()
    console.log('Places collection already exists')
  } catch (error: any) {
    if (error.httpStatus === 404) {
      // Create collection
      try {
        await client.collections().create(placesSchema)
        console.log('Created places collection in Typesense')
      } catch (createError) {
        console.error('Error creating places collection:', createError)
        throw createError
      }
    } else {
      console.error('Error checking places collection:', error)
      throw error
    }
  }
}

export { client as typesenseClient }
