'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface FilterState {
  categories: string[]
  hasWifi: boolean
  hasOutlets: boolean
  minScore: number
  openNow: boolean
}

interface FilterPanelProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  isOpen: boolean
  onToggle: () => void
}

const categoryOptions = [
  { value: 'cafe', label: 'Cafes', icon: '☕' },
  { value: 'library', label: 'Libraries', icon: '📚' },
  { value: 'coworking', label: 'Coworking', icon: '💼' },
  { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { value: 'bookstore', label: 'Bookstores', icon: '📖' },
]

export function FilterPanel({ filters, onFiltersChange, isOpen, onToggle }: FilterPanelProps) {
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const toggleCategory = (category: string) => {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category]
    updateFilter('categories', categories)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      hasWifi: false,
      hasOutlets: false,
      minScore: 0,
      openNow: false,
    })
  }

  const activeFilterCount = [
    filters.categories.length > 0,
    filters.hasWifi,
    filters.hasOutlets,
    filters.minScore > 0,
    filters.openNow,
  ].filter(Boolean).length

  return (
    <>
      {/* Filter Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          'fixed top-4 right-4 z-30 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2 transition-colors',
          isOpen ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
        )}
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </span>
      </button>

      {/* Filter Panel */}
      <div
        className={cn(
          'fixed top-16 right-4 z-30 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 transition-all duration-200',
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
          <div className="grid grid-cols-2 gap-2">
            {categoryOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleCategory(option.value)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border transition-colors text-sm',
                  filters.categories.includes(option.value)
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasWifi}
                onChange={(e) => updateFilter('hasWifi', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">📶 WiFi available</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasOutlets}
                onChange={(e) => updateFilter('hasOutlets', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">🔌 Outlets available</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.openNow}
                onChange={(e) => updateFilter('openNow', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">🕐 Open now</span>
            </label>
          </div>
        </div>

        {/* Workability Score */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Min. Workability Score: {Math.round(filters.minScore * 100)}%
          </h4>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={filters.minScore}
            onChange={(e) => updateFilter('minScore', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20"
          onClick={onToggle}
        />
      )}
    </>
  )
}
