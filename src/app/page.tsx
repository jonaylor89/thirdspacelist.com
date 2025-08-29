"use client"

import { useState, useEffect, useCallback } from 'react'
import { Map } from '@/components/Map'
import { PlaceCard } from '@/components/PlaceCard'
import { BottomSheet } from '@/components/BottomSheet'
import { FilterPanel, FilterState } from '@/components/FilterPanel'
import { ObservationForm, ObservationData } from '@/components/ObservationForm'
import { Auth } from '@/components/Auth'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface Place {
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

interface PlaceDetails extends Place {
  observations?: any[]
  stats?: {
    totalObservations: number
    recentObservations: number
    avgWifiSpeed?: number
    avgNoiseLevel?: number
    avgCrowdedness?: number
  }
  recentObservations?: any[]
}

export default function Home() {
  const { user } = useAuth()
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [showObservationForm, setShowObservationForm] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([-74.006, 40.7128]) // Default to NYC
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    hasWifi: false,
    hasOutlets: false,
    minScore: 0,
    openNow: false,
  })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'map' | 'list'>('map')

  const fetchPlaces = useCallback(async () => {
    console.log('fetchPlaces', { places, selectedPlace });
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (currentLocation) {
        params.append('lat', currentLocation[1].toString())
        params.append('lng', currentLocation[0].toString())
        params.append('radius', '5000') // 5km radius
      }
      
      if (filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','))
      }
      
      if (filters.hasWifi) params.append('wifi', 'true')
      if (filters.hasOutlets) params.append('outlets', 'true')
      if (filters.minScore > 0) params.append('minScore', filters.minScore.toString())

      const response = await fetch(`/api/places?${params}`)
      const data = await response.json()
      
      if (data.places) {
        setPlaces(data.places)
      }
    } catch (error) {
      console.error('Error fetching places:', error)
    } finally {
      setLoading(false)
    }
  }, [currentLocation, filters])

  const fetchPlaceDetails = async (placeId: string) => {
    try {
      const response = await fetch(`/api/places/${placeId}`)
      const data = await response.json()
      return data.place
    } catch (error) {
      console.error('Error fetching place details:', error)
      return null
    }
  }

  const handlePlaceClick = async (place: Place) => {
    const placeDetails = await fetchPlaceDetails(place.id)
    if (placeDetails) {
      setSelectedPlace(placeDetails)
      setIsBottomSheetOpen(true)
    }
  }

  const handleObservationSubmit = async (observation: ObservationData) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
          }),
        },
        body: JSON.stringify(observation),
      })

      if (response.ok) {
        setShowObservationForm(false)
        // Refresh place details
        if (selectedPlace) {
          const updatedPlace = await fetchPlaceDetails(selectedPlace.id)
          if (updatedPlace) {
            setSelectedPlace(updatedPlace)
          }
        }
        // Refresh places list
        fetchPlaces()
      } else {
        throw new Error('Failed to submit observation')
      }
    } catch (error) {
      console.error('Error submitting observation:', error)
      alert('Failed to submit observation. Please try again.')
    }
  }

  const handleAddObservation = () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowObservationForm(true)
  }

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation([position.coords.longitude, position.coords.latitude])
        },
        (error) => {
          console.warn('Geolocation error:', error)
          alert('Could not get your location. Using NYC as default.')
        }
      )
    } else {
      alert('Geolocation is not supported by this browser.')
    }
  }

  // Fetch places when location or filters change
  useEffect(() => {
    console.log('useEffect fetchPlaces', { currentLocation, filters });
    fetchPlaces()
  }, [currentLocation, fetchPlaces])

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 relative z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ThirdSpaceList</h1>
            <p className="text-sm text-gray-600">Find your perfect work spot</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={requestLocation}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              title="Use my location"
            >
              📍
            </button>
            <button
              onClick={() => setView(view === 'map' ? 'list' : 'map')}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {view === 'map' ? '📋 List' : '🗺️ Map'}
            </button>
            {user ? (
              <button
                onClick={() => window.location.href = '/profile'}
                className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                👤 Profile
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {view === 'map' ? (
          <Map
            places={places}
            onPlaceClick={handlePlaceClick}
            center={currentLocation}
            zoom={13}
          />
        ) : (
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading places...</div>
              </div>
            ) : places.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">No places found</div>
              </div>
            ) : (
              places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onClick={() => handlePlaceClick(place)}
                  showDistance={true}
                />
              ))
            )}
          </div>
        )}

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={isFiltersOpen}
          onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
        />

        {/* Bottom Sheet for Place Details */}
        <BottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => {
            setIsBottomSheetOpen(false)
            setShowObservationForm(false)
            setSelectedPlace(null)
          }}
          title={selectedPlace?.name}
        >
          {selectedPlace && (
            <div className="space-y-6">
              {!showObservationForm ? (
                <>
                  {/* Place Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedPlace.categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    {selectedPlace.address && (
                      <p className="text-gray-600">{selectedPlace.address}</p>
                    )}
                    {selectedPlace.workability_score !== null && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Workability Score</span>
                          <span className="text-lg font-bold text-green-600">
                            {Math.round((selectedPlace.workability_score || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Statistics */}
                  {selectedPlace.stats && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Recent Stats</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Observations</p>
                          <p className="font-semibold">{selectedPlace.stats.totalObservations}</p>
                        </div>
                        {selectedPlace.stats.avgWifiSpeed && (
                          <div>
                            <p className="text-gray-600">Avg WiFi Speed</p>
                            <p className="font-semibold">{selectedPlace.stats.avgWifiSpeed.toFixed(1)} Mbps</p>
                          </div>
                        )}
                        {selectedPlace.stats.avgNoiseLevel && (
                          <div>
                            <p className="text-gray-600">Avg Noise Level</p>
                            <p className="font-semibold">{selectedPlace.stats.avgNoiseLevel.toFixed(0)} dB</p>
                          </div>
                        )}
                        {selectedPlace.stats.avgCrowdedness && (
                          <div>
                            <p className="text-gray-600">Avg Crowdedness</p>
                            <p className="font-semibold">{selectedPlace.stats.avgCrowdedness.toFixed(1)}/5</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Add Observation Button */}
                  <button
                    onClick={handleAddObservation}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {user ? 'Add Your Observation' : 'Sign In to Add Observation'}
                  </button>

                  {/* Recent Observations */}
                  {selectedPlace.recentObservations && selectedPlace.recentObservations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Recent Observations</h4>
                      <div className="space-y-3">
                        {selectedPlace.recentObservations.slice(0, 3).map((obs: any) => (
                          <div key={obs.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-gray-600">
                                {obs.profiles?.full_name || 'Anonymous'}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {new Date(obs.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {obs.wifi_speed_download && (
                              <p>📶 WiFi: {obs.wifi_speed_download} Mbps</p>
                            )}
                            {obs.noise_level && (
                              <p>🔊 Noise: {obs.noise_level} dB</p>
                            )}
                            {obs.notes && (
                              <p className="text-gray-600 mt-1">"{obs.notes}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <ObservationForm
                  placeId={selectedPlace.id}
                  placeName={selectedPlace.name}
                  onSubmit={handleObservationSubmit}
                  onCancel={() => setShowObservationForm(false)}
                />
              )}
            </div>
          )}
        </BottomSheet>

        {/* Auth Modal */}
        <BottomSheet
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="Authentication"
        >
          <Auth onUserChange={(user) => {
            if (user) {
              setShowAuthModal(false)
            }
          }} />
        </BottomSheet>
      </main>
    </div>
  )
}
