'use client'

import { formatDistance, formatWorkabilityScore, getWorkabilityColor } from '@/lib/utils'

interface Place {
  id: string
  name: string
  categories: string[]
  address?: string
  workability_score?: number
  distance_meters?: number
  wifi_available?: boolean
  outlets_available?: boolean
}

interface PlaceCardProps {
  place: Place
  onClick?: () => void
  showDistance?: boolean
}

const categoryIcons: Record<string, string> = {
  cafe: '☕',
  library: '📚',
  coworking: '💼',
  restaurant: '🍽️',
  fast_food: '🍔',
  bookstore: '📖',
  other: '📍',
}

const categoryLabels: Record<string, string> = {
  cafe: 'Cafe',
  library: 'Library',
  coworking: 'Coworking',
  restaurant: 'Restaurant',
  fast_food: 'Fast Food',
  bookstore: 'Bookstore',
  other: 'Other',
}

export function PlaceCard({ place, onClick, showDistance = false }: PlaceCardProps) {
  const primaryCategory = place.categories[0] || 'other'
  const scoreColor = getWorkabilityColor(place.workability_score ?? null)

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label={primaryCategory}>
            {categoryIcons[primaryCategory]}
          </span>
          <h3 className="font-semibold text-gray-900 truncate">{place.name}</h3>
        </div>
        {place.workability_score !== null && (
          <div
            className="px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: scoreColor }}
          >
            {formatWorkabilityScore(place.workability_score ?? null)}
          </div>
        )}
      </div>

      {place.address && (
        <p className="text-sm text-gray-600 mb-2 truncate">{place.address}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="px-2 py-1 bg-gray-100 rounded-full">
          {categoryLabels[primaryCategory]}
        </span>

        {place.wifi_available && (
          <span className="flex items-center gap-1">
            📶 WiFi
          </span>
        )}

        {place.outlets_available && (
          <span className="flex items-center gap-1">
            🔌 Outlets
          </span>
        )}

        {showDistance && place.distance_meters !== undefined && (
          <span className="flex items-center gap-1">
            📍 {formatDistance(place.distance_meters)}
          </span>
        )}
      </div>

      {place.categories.length > 1 && (
        <div className="flex gap-1 mt-2">
          {place.categories.slice(1, 3).map((category) => (
            <span
              key={category}
              className="px-2 py-1 bg-gray-50 rounded-full text-xs text-gray-600"
            >
              {categoryLabels[category] || category}
            </span>
          ))}
          {place.categories.length > 3 && (
            <span className="px-2 py-1 bg-gray-50 rounded-full text-xs text-gray-600">
              +{place.categories.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
