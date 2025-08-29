'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDistance, formatWorkabilityScore } from '@/lib/utils'

const supabase = createClient()

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  contribution_count: number
  created_at: string
  updated_at: string
}

interface Observation {
  id: string
  place_id: string
  wifi_speed_download: number | null
  wifi_speed_upload: number | null
  wifi_latency: number | null
  noise_level: number | null
  outlet_count: number | null
  crowdedness: number | null
  notes: string | null
  created_at: string
  places: {
    name: string
    address: string | null
  }
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/'
      return
    }

    if (user) {
      fetchProfile()
      fetchObservations()
    }
  }, [user, authLoading])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data as any)
      setFullName((data as any).full_name || '')
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchObservations = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('observations')
        .select(`
          *,
          places (
            name,
            address
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setObservations(data || [])
    } catch (error) {
      console.error('Error fetching observations:', error)
    }
  }

  const updateProfile = async () => {
    if (!user || !profile) return

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setProfile({
        ...profile,
        full_name: fullName.trim() || null,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Please sign in to view your profile.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Map
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <button
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-700 text-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <p className="text-gray-900">{profile.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={updateProfile}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="text-gray-900">
                  {profile.full_name || 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member Since
              </label>
              <p className="text-gray-900">
                {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{profile.contribution_count}</div>
            <div className="text-sm text-gray-600">Total Contributions</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{observations.length}</div>
            <div className="text-sm text-gray-600">Recent Observations</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {observations.filter(obs => obs.wifi_speed_download).length}
            </div>
            <div className="text-sm text-gray-600">WiFi Tests</div>
          </div>
        </div>

        {/* Recent Observations */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Observations</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {observations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No observations yet.</p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="mt-2 text-blue-600 hover:text-blue-700"
                >
                  Start exploring places →
                </button>
              </div>
            ) : (
              observations.map((obs) => (
                <div key={obs.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{obs.places.name}</h3>
                      {obs.places.address && (
                        <p className="text-sm text-gray-600">{obs.places.address}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(obs.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {obs.wifi_speed_download && (
                      <div>
                        <span className="text-gray-600">WiFi Speed:</span>
                        <span className="ml-1 font-medium">
                          {obs.wifi_speed_download} Mbps
                        </span>
                      </div>
                    )}
                    {obs.noise_level && (
                      <div>
                        <span className="text-gray-600">Noise:</span>
                        <span className="ml-1 font-medium">
                          {obs.noise_level} dB
                        </span>
                      </div>
                    )}
                    {obs.outlet_count !== null && (
                      <div>
                        <span className="text-gray-600">Outlets:</span>
                        <span className="ml-1 font-medium">
                          {obs.outlet_count}
                        </span>
                      </div>
                    )}
                    {obs.crowdedness && (
                      <div>
                        <span className="text-gray-600">Crowdedness:</span>
                        <span className="ml-1 font-medium">
                          {obs.crowdedness}/5
                        </span>
                      </div>
                    )}
                  </div>

                  {obs.notes && (
                    <div className="mt-2">
                      <span className="text-gray-600 text-sm">Notes:</span>
                      <p className="text-sm text-gray-900 mt-1">"{obs.notes}"</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
