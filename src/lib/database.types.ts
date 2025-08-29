export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      places: {
        Row: {
          id: string
          osm_id: string | null
          name: string
          categories: string[]
          location: unknown // PostGIS geometry
          address: string | null
          website: string | null
          phone: string | null
          opening_hours: string | null
          wifi_available: boolean | null
          outlets_available: boolean | null
          workability_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          osm_id?: string | null
          name: string
          categories: string[]
          location: unknown
          address?: string | null
          website?: string | null
          phone?: string | null
          opening_hours?: string | null
          wifi_available?: boolean | null
          outlets_available?: boolean | null
          workability_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          osm_id?: string | null
          name?: string
          categories?: string[]
          location?: unknown
          address?: string | null
          website?: string | null
          phone?: string | null
          opening_hours?: string | null
          wifi_available?: boolean | null
          outlets_available?: boolean | null
          workability_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      observations: {
        Row: {
          id: string
          place_id: string
          user_id: string | null
          wifi_speed_download: number | null
          wifi_speed_upload: number | null
          wifi_latency: number | null
          noise_level: number | null
          outlet_count: number | null
          crowdedness: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          place_id: string
          user_id?: string | null
          wifi_speed_download?: number | null
          wifi_speed_upload?: number | null
          wifi_latency?: number | null
          noise_level?: number | null
          outlet_count?: number | null
          crowdedness?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          place_id?: string
          user_id?: string | null
          wifi_speed_download?: number | null
          wifi_speed_upload?: number | null
          wifi_latency?: number | null
          noise_level?: number | null
          outlet_count?: number | null
          crowdedness?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          contribution_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          contribution_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          contribution_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      nearby_places: {
        Args: {
          lat: number
          lng: number
          radius_meters: number
        }
        Returns: {
          id: string
          name: string
          categories: string[]
          address: string | null
          workability_score: number | null
          distance_meters: number
          place_lng: number
          place_lat: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
