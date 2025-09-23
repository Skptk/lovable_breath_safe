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
      affiliate_products: {
        Row: {
          affiliate_url: string
          coverage_area: string
          created_at: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          price_range: string
          rating: number
          retailer: string
        }
        Insert: {
          affiliate_url: string
          coverage_area: string
          created_at?: string
          description: string
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          price_range: string
          rating: number
          retailer: string
        }
        Update: {
          affiliate_url?: string
          coverage_area?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          price_range?: string
          rating?: number
          retailer?: string
        }
      }
      air_quality_readings: {
        Row: {
          aqi: number
          co: number | null
          created_at: string
          id: string
          latitude: number
          location_name: string
          longitude: number
          no2: number | null
          o3: number | null
          pm10: number | null
          pm25: number | null
          points_awarded: number
          so2: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          aqi: number
          co?: number | null
          created_at?: string
          id?: string
          latitude: number
          location_name: string
          longitude: number
          no2?: number | null
          o3?: number | null
          pm10?: number | null
          pm25?: number | null
          points_awarded: number
          so2?: number | null
          timestamp: string
          user_id: string
        }
        Update: {
          aqi?: number
          co?: number | null
          created_at?: string
          id?: string
          latitude?: number
          location_name?: string
          longitude?: number
          no2?: number | null
          o3?: number | null
          pm10?: number | null
          pm25?: number | null
          points_awarded?: number
          so2?: number | null
          timestamp?: string
          user_id?: string
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}