export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      affiliate_products: {
        Row: {
          affiliate_url: string
          coverage_area: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price_range: string | null
          rating: number | null
          retailer: string
        }
        Insert: {
          affiliate_url: string
          coverage_area?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price_range?: string | null
          rating?: number | null
          retailer: string
        }
        Update: {
          affiliate_url?: string
          coverage_area?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price_range?: string | null
          rating?: number | null
          retailer?: string
        }
        Relationships: []
      }
      air_quality_readings: {
        Row: {
          aqi: number
          co: number | null
          created_at: string
          id: string
          latitude: number
          location_name: string | null
          longitude: number
          no2: number | null
          o3: number | null
          pm10: number | null
          pm25: number | null
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
          location_name?: string | null
          longitude: number
          no2?: number | null
          o3?: number | null
          pm10?: number | null
          pm25?: number | null
          so2?: number | null
          timestamp?: string
          user_id: string
        }
        Update: {
          aqi?: number
          co?: number | null
          created_at?: string
          id?: string
          latitude?: number
          location_name?: string | null
          longitude?: number
          no2?: number | null
          o3?: number | null
          pm10?: number | null
          pm25?: number | null
          so2?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      pollutant_details: {
        Row: {
          created_at: string
          description: string
          health_effects: string | null
          id: string
          name: string
          pollutant_code: string
          safe_levels: string | null
        }
        Insert: {
          created_at?: string
          description: string
          health_effects?: string | null
          id?: string
          name: string
          pollutant_code: string
          safe_levels?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          health_effects?: string | null
          id?: string
          name?: string
          pollutant_code?: string
          safe_levels?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          aqi_value: number
          created_at: string
          id: string
          location_name: string | null
          points_earned: number
          timestamp: string
          user_id: string
        }
        Insert: {
          aqi_value: number
          created_at?: string
          id?: string
          location_name?: string | null
          points_earned: number
          timestamp?: string
          user_id: string
        }
        Update: {
          aqi_value?: number
          created_at?: string
          id?: string
          location_name?: string | null
          points_earned?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          category: string
          points_reward: number
          criteria_type: string
          criteria_value: number
          criteria_unit: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          category: string
          points_reward: number
          criteria_type: string
          criteria_value: number
          criteria_unit?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          category?: string
          points_reward?: number
          criteria_type?: string
          criteria_value?: number
          criteria_unit?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          progress: number
          max_progress: number
          unlocked: boolean
          unlocked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          progress?: number
          max_progress: number
          unlocked?: boolean
          unlocked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          progress?: number
          max_progress?: number
          unlocked?: boolean
          unlocked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          id: string
          user_id: string
          streak_type: string
          current_streak: number
          max_streak: number
          last_activity_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          streak_type: string
          current_streak?: number
          max_streak?: number
          last_activity_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          streak_type?: string
          current_streak?: number
          max_streak?: number
          last_activity_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          id: string
          user_id: string
          amount: number
          method: string
          status: string
          paypal_email: string | null
          mpesa_phone: string | null
          notes: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          method: string
          status?: string
          paypal_email?: string | null
          mpesa_phone?: string | null
          notes?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          method?: string
          status?: string
          paypal_email?: string | null
          mpesa_phone?: string | null
          notes?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          priority: Database["public"]["Enums"]["notification_priority"]
          title: string
          message: string
          data: Json | null
          read: boolean
          action_url: string | null
          expires_at: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          priority?: Database["public"]["Enums"]["notification_priority"]
          title: string
          message: string
          data?: Json | null
          read?: boolean
          action_url?: string | null
          expires_at?: string | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          priority?: Database["public"]["Enums"]["notification_priority"]
          title?: string
          message?: string
          data?: Json | null
          read?: boolean
          action_url?: string | null
          expires_at?: string | null
          created_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          aqi_alerts: boolean
          aqi_threshold: number
          achievement_notifications: boolean
          points_notifications: boolean
          withdrawal_notifications: boolean
          shop_notifications: boolean
          streak_notifications: boolean
          daily_reminders: boolean
          weekly_summaries: boolean
          system_announcements: boolean
          maintenance_alerts: boolean
          email_notifications: boolean
          push_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          aqi_alerts?: boolean
          aqi_threshold?: number
          achievement_notifications?: boolean
          points_notifications?: boolean
          withdrawal_notifications?: boolean
          shop_notifications?: boolean
          streak_notifications?: boolean
          daily_reminders?: boolean
          weekly_summaries?: boolean
          system_announcements?: boolean
          maintenance_alerts?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          aqi_alerts?: boolean
          aqi_threshold?: number
          achievement_notifications?: boolean
          points_notifications?: boolean
          withdrawal_notifications?: boolean
          shop_notifications?: boolean
          streak_notifications?: boolean
          daily_reminders?: boolean
          weekly_summaries?: boolean
          system_announcements?: boolean
          maintenance_alerts?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "user" | "admin"
      notification_type: "aqi_alert" | "achievement_unlocked" | "points_earned" | "withdrawal_approved" | "withdrawal_rejected" | "shop_new_item" | "shop_sale" | "streak_milestone" | "daily_reminder" | "weekly_summary" | "system_announcement" | "maintenance" | "welcome"
      notification_priority: "low" | "medium" | "high" | "urgent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin"],
      notification_type: ["aqi_alert", "achievement_unlocked", "points_earned", "withdrawal_approved", "withdrawal_rejected", "shop_new_item", "shop_sale", "streak_milestone", "daily_reminder", "weekly_summary", "system_announcement", "maintenance", "welcome"],
      notification_priority: ["low", "medium", "high", "urgent"],
    },
  },
} as const
