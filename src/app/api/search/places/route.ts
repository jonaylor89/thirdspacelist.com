import { NextRequest, NextResponse } from 'next/server'
import { typesenseClient } from '@/lib/typesense'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Search parameters
  const q = searchParams.get('q') || '*' // Search query
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '5' // km
  
  // Filters
  const categories = searchParams.get('categories')?.split(',') || []
  const hasWifi = searchParams.get('wifi') === 'true'
  const hasOutlets = searchParams.get('outlets') === 'true'
  const minScore = searchParams.get('minScore')
  
  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const perPage = parseInt(searchParams.get('per_page') || '50')
  
  // Sorting
  const sortBy = searchParams.get('sort_by') || 'workability_score:desc'

  try {
    // Build filter conditions
    const filters: string[] = []
    
    if (categories.length > 0) {
      // Filter by categories using array intersection
      const categoryFilter = categories.map(cat => `categories:=${cat}`).join(' || ')
      filters.push(`(${categoryFilter})`)
    }
    
    if (hasWifi) {
      filters.push('wifi_available:=true')
    }
    
    if (hasOutlets) {
      filters.push('outlets_available:=true')
    }
    
    if (minScore) {
      filters.push(`workability_score:>=${parseFloat(minScore)}`)
    }

    // Build search parameters
    const searchParams2: any = {
      q,
      query_by: 'name,searchable_text,categories',
      filter_by: filters.length > 0 ? filters.join(' && ') : undefined,
      sort_by: sortBy,
      page,
      per_page: perPage,
      facet_by: 'categories,wifi_available,outlets_available',
      max_facet_values: 20,
      num_typos: 2,
      prefix: true,
      drop_tokens_threshold: 1,
      typo_tokens_threshold: 1,
    }

    // Add geo-filtering if coordinates provided
    if (lat && lng) {
      const radiusMeters = parseFloat(radius) * 1000 // Convert km to meters
      filters.push(`location:(${lat}, ${lng}, ${radiusMeters} km)`)
      searchParams2.filter_by = filters.join(' && ')
      
      // Sort by distance if no other sorting specified
      if (!searchParams.get('sort_by')) {
        searchParams2.sort_by = `location(${lat}, ${lng}):asc`
      }
    }

    console.log('Typesense search params:', searchParams2)

    const searchResult = await typesenseClient
      .collections('places')
      .documents()
      .search(searchParams2)

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
      ...(lat && lng && hit.geo_distance_meters && {
        distance_meters: hit.geo_distance_meters.location
      }),
      // Add search highlights
      ...(hit.highlights && {
        highlights: hit.highlights
      }),
      // Add text match score
      text_match_score: hit.text_match_score || 0
    })) || []

    const response = {
      places,
      found: searchResult.found || 0,
      page: searchResult.page || 1,
      per_page: perPage,
      total_pages: Math.ceil((searchResult.found || 0) / perPage),
      facet_counts: searchResult.facet_counts || [],
      search_time_ms: searchResult.search_time_ms || 0,
      search_cutoff: searchResult.search_cutoff || false
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Typesense search error:', error)
    
    // Return helpful error information
    let errorMessage = 'Search failed'
    let statusCode = 500
    
    if (error.httpStatus) {
      statusCode = error.httpStatus
    }
    
    if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: statusCode }
    )
  }
}
