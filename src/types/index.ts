// User Types
export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  phone?: string;
  phone_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    email: string;
    email_verified: boolean;
    full_name: string;
    sub: string;
  };
  aud: string;
  role: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

// Air Quality Types
export interface AirQualityReading {
  id: string;
  user_id: string;
  aqi: number;
  pm25: number;
  pm10: number;
  pm1: number;
  temperature: number;
  humidity: number;
  location_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  data_source: string;
  pollutant_details?: PollutantDetail[];
}

export interface PollutantDetail {
  id: string;
  reading_id: string;
  pollutant_type: string;
  value: number;
  unit: string;
  aqi_category: string;
  health_implications: string;
}

// Achievement Types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'reading' | 'streak' | 'quality' | 'milestone' | 'special';
  points_reward: number;
  criteria_type: 'count' | 'streak' | 'quality' | 'points' | 'custom';
  criteria_value: number;
  criteria_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  max_progress: number;
  unlocked: boolean;
  unlocked_at?: string;
  created_at: string;
  updated_at: string;
  achievement?: Achievement;
}

export interface UserStreak {
  id: string;
  user_id: string;
  streak_type: 'daily_reading' | 'good_air_quality' | 'weekly_activity';
  current_streak: number;
  max_streak: number;
  last_activity_date: string;
  created_at: string;
  updated_at: string;
}

// Withdrawal Types
export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  method: 'paypal' | 'mpesa';
  status: 'pending' | 'approved' | 'rejected';
  paypal_email?: string;
  mpesa_phone?: string;
  notes?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// Gift Card Types
export interface GiftCard {
  id: string;
  name: string;
  value: number;
  points_required: number;
  image_url?: string;
  available: boolean;
}

// API Types
export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
  timestamp: number;
}

export interface ApiOptions {
  cache?: boolean;
  cacheTTL?: number;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

// UI Types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

export interface FormData {
  [key: string]: any;
}

export interface FormValidation {
  [key: string]: string | undefined;
}

// Navigation Types
export interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
  children?: NavigationItem[];
}

// Map Types
export interface MapLocation {
  latitude: number;
  longitude: number;
  name: string;
  aqi?: number;
  timestamp?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Chart Types
export interface ChartDataPoint {
  label: string;
  value: number;
  timestamp?: string;
  color?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: ChartDataPoint[];
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    scales?: any;
    plugins?: any;
  };
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

// Settings Types
export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    share_data: boolean;
    public_profile: boolean;
  };
  preferences: {
    default_location: string;
    aqi_threshold: number;
    refresh_interval: number;
  };
  created_at: string;
  updated_at: string;
}

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  timestamp: string;
  session_id: string;
  user_agent: string;
  ip_address?: string;
}

export interface AnalyticsMetrics {
  total_readings: number;
  average_aqi: number;
  good_air_days: number;
  streak_days: number;
  achievements_unlocked: number;
  points_earned: number;
}

// Export all types
export type {
  User,
  Profile,
  AirQualityReading,
  PollutantDetail,
  Achievement,
  UserAchievement,
  UserStreak,
  WithdrawalRequest,
  GiftCard,
  ApiResponse,
  ApiOptions,
  LoadingState,
  PaginationState,
  FormField,
  FormData,
  FormValidation,
  NavigationItem,
  MapLocation,
  MapBounds,
  ChartDataPoint,
  ChartConfig,
  Notification,
  UserSettings,
  AnalyticsEvent,
  AnalyticsMetrics,
};
