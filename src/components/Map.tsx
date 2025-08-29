'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getWorkabilityColor } from '@/lib/utils'

interface Place {
  id: string
  name: string
  categories: string[]
  address?: string
  workability_score?: number
  distance_meters?: number
  place_lng?: number
  place_lat?: number
}

interface MapProps {
  places: Place[]
  onPlaceClick?: (place: Place) => void
  center?: [number, number]
  zoom?: number
}

export function Map({ places, onPlaceClick, center = [-74.006, 40.7128], zoom = 13 }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)

  console.log({ places, center, zoom });

  useEffect(() => {
    console.log('Map initialization:', {
      token: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? 'present' : 'missing',
      mapExists: !!map.current,
      containerExists: !!mapContainer.current,
      center,
      zoom
    })

    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      console.error('Mapbox access token is required')
      return
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

    if (map.current || !mapContainer.current) return

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
      attributionControl: false,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add geolocate control
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
    })

    map.current.addControl(geolocateControl, 'top-right')

    // Get user location
    geolocateControl.on('geolocate', (e: any) => {
      setCurrentLocation([e.coords.longitude, e.coords.latitude])
    })

    map.current.on('load', () => {
      console.log('Map loaded successfully')
      // Add places source
      map.current!.addSource('places', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      // Add cluster circles
      map.current!.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            100,
            '#f1f075',
            750,
            '#f28cb1',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
        },
      })

      // Add cluster count labels
      map.current!.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'places',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Add individual place circles
      map.current!.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['!=', ['get', 'workability_score'], null],
            [
              'interpolate',
              ['linear'],
              ['get', 'workability_score'],
              0, '#ef4444',
              0.4, '#f97316',
              0.6, '#f59e0b',
              0.8, '#10b981',
              1, '#059669'
            ],
            '#6b7280'
          ],
          'circle-radius': {
            base: 1.75,
            stops: [
              [12, 6],
              [22, 12],
            ],
          },
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Click handlers
      map.current!.on('click', 'clusters', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ['clusters'],
        })
        const clusterId = features[0].properties!.cluster_id
        const source = map.current!.getSource('places') as mapboxgl.GeoJSONSource
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return

          map.current!.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom: zoom || 10,
          })
        })
      })

      map.current!.on('click', 'unclustered-point', (e) => {
        if (e.features && e.features[0] && onPlaceClick) {
          const place = e.features[0].properties as any
          onPlaceClick({
            id: place.id,
            name: place.name,
            categories: JSON.parse(place.categories),
            address: place.address,
            workability_score: place.workability_score,
          })
        }
      })

      // Change cursor on hover
      map.current!.on('mouseenter', 'clusters', () => {
        map.current!.getCanvas().style.cursor = 'pointer'
      })
      map.current!.on('mouseleave', 'clusters', () => {
        map.current!.getCanvas().style.cursor = ''
      })
      map.current!.on('mouseenter', 'unclustered-point', () => {
        map.current!.getCanvas().style.cursor = 'pointer'
      })
      map.current!.on('mouseleave', 'unclustered-point', () => {
        map.current!.getCanvas().style.cursor = ''
      })
    })

    // Add error handling
    map.current.on('error', (e) => {
      console.error('Mapbox error:', e)
    })

    console.log('Map initialization complete')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [center, zoom, onPlaceClick])

  // Update places data when places prop changes
  useEffect(() => {
    console.log('Map places update:', { mapExists: !!map.current, placesCount: places?.length, places })
    
    if (!map.current || !places) return

    // Wait for map to be loaded before updating source
    if (!map.current.loaded()) {
      map.current.on('load', () => {
        updatePlacesSource()
      })
      return
    }

    updatePlacesSource()

    function updatePlacesSource() {
      if (!map.current || !places) return

      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: places.map((place) => {
          const coords = [place.place_lng || 0, place.place_lat || 0]
          console.log(`Place ${place.name}:`, { coords, place_lng: place.place_lng, place_lat: place.place_lat })
          
          return {
            type: 'Feature' as const,
            properties: {
              id: place.id,
              name: place.name,
              categories: JSON.stringify(place.categories),
              address: place.address || '',
              workability_score: place.workability_score,
              distance_meters: place.distance_meters,
            },
            geometry: {
              type: 'Point' as const,
              coordinates: coords,
            },
          }
        }),
      }

      console.log('Generated GeoJSON:', geojsonData)

      const source = map.current!.getSource('places') as mapboxgl.GeoJSONSource
      if (source) {
        console.log('Updating map source with data')
        source.setData(geojsonData)
      } else {
        console.error('Map source "places" not found, map may not be fully loaded')
      }
    }
  }, [places])

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  )
}
