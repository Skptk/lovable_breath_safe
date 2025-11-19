import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { debugTracker } from '@/utils/errorTracker';
import { isDebugBuild } from '@/utils/debugFlags';

const ENABLE_WEATHER_LOGS = import.meta.env.DEV || isDebugBuild;

const shouldTrackWeatherState = typeof __TRACK_VARIABLES__ === 'undefined' || __TRACK_VARIABLES__;
const MIN_WEATHER_FETCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MIN_FORECAST_FETCH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// LRU Cache configuration for memory optimization
const MAX_CACHE_ENTRIES = 100; // Maximum number of cached weather entries per coordinate pair
const MAX_FORECAST_CACHE_ENTRIES = 50; // Maximum number of cached forecast entries

const trackWeatherState = (action: string, payload: unknown) => {
  if (ENABLE_WEATHER_LOGS) {
    console.log(`🏪 [STORE] Weather state changing via ${action}:`, payload);
  }
  if (shouldTrackWeatherState) {
    debugTracker.trackVariableDeclaration(
      'weatherState',
      { action, payload, timestamp: Date.now() },
      'weatherStore.ts'
    );
  }
};

// Weather data types
export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  airPressure?: number;
  rainProbability?: number;
  uvIndex?: number;
  visibility?: number;
  weatherCondition: string;
  feelsLikeTemperature?: number;
  sunriseTime?: string;
  sunsetTime?: string;
  timestamp: string;
  dataSource: string;
}

export interface ForecastData {
  date: string;
  temperature: {
    min: number;
    max: number;
    avg: number;
  };
  humidity: number;
  windSpeed: number;
  windDirection: number;
  rainProbability: number;
  weatherCondition: string;
  uvIndex?: number;
}

// LRU Cache entry type
type CacheEntry<T> = {
  data: T;
  timestamp: number;
  key: string;
};

// Simple LRU Cache implementation
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add new entry
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });
    
    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export interface WeatherStoreState {
  // Weather data
  weatherData: WeatherData | null;
  forecastData: ForecastData[];
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Rate limiting and caching
  lastFetchTime: number | null;
  rateLimitUntil: number | null;
  isRateLimited: boolean;
  
  // Coordinates
  currentCoordinates: { latitude: number; longitude: number } | null;
  
  // Cache keys for different data types
  weatherCacheKey: string | null;
  forecastCacheKey: string | null;
}

export interface WeatherStoreActions {
  // Data fetching
  fetchWeatherData: (coordinates: { latitude: number; longitude: number }) => Promise<WeatherData | null>;
  fetchForecastData: (coordinates: { latitude: number; longitude: number }) => Promise<ForecastData[] | null>;
  
  // State management
  setWeatherData: (data: WeatherData) => void;
  setForecastData: (data: ForecastData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Rate limiting
  setRateLimited: (until: number) => void;
  clearRateLimit: () => void;
  
  // Coordinates
  setCoordinates: (coordinates: { latitude: number; longitude: number }) => void;
  
  // Cache management
  clearCache: () => void;
  getCachedWeather: () => WeatherData | null;
  getCachedForecast: () => ForecastData[] | null;
}

export type WeatherStore = WeatherStoreState & WeatherStoreActions;

// Create LRU caches for weather data
const weatherCache = new LRUCache<WeatherData>(MAX_CACHE_ENTRIES);
const forecastCache = new LRUCache<ForecastData[]>(MAX_FORECAST_CACHE_ENTRIES);

// Create the weather store
export const useWeatherStore = create<WeatherStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      weatherData: null,
      forecastData: [], // CRITICAL: Limited to 5 days max for memory efficiency
      isLoading: false,
      error: null,
      lastFetchTime: null,
      rateLimitUntil: null,
      isRateLimited: false,
      currentCoordinates: null,
      weatherCacheKey: null,
      forecastCacheKey: null,

      // Set weather data with caching
      setWeatherData: (data) => {
        trackWeatherState('setWeatherData', data);
        const state = get();
        
        // Cache the weather data
        if (state.weatherCacheKey) {
          weatherCache.set(state.weatherCacheKey, data);
        }
        
        set({ 
          weatherData: data,
          lastFetchTime: Date.now(),
          error: null,
          isLoading: false
        });
      },

      // Set forecast data with size limit
      setForecastData: (data) => {
        trackWeatherState('setForecastData', data);
        // CRITICAL: Limit to 5 days max to prevent memory growth
        const limitedData = data.slice(0, 5);
        const state = get();
        
        // Cache the forecast data
        if (state.forecastCacheKey) {
          forecastCache.set(state.forecastCacheKey, limitedData);
        }
        
        set({ 
          forecastData: limitedData,
          lastFetchTime: Date.now(),
          error: null,
          isLoading: false
        });
      },

      // Set loading state
      setLoading: (loading) => {
        trackWeatherState('setLoading', loading);
        set({ isLoading: loading });
      },

      // Set error state
      setError: (error) => {
        trackWeatherState('setError', error);
        set({ error, isLoading: false });
      },

      // Set rate limited state
      setRateLimited: (until) => {
        set({ 
          rateLimitUntil: until,
          isRateLimited: true
        });

        trackWeatherState('setRateLimited', until);
        
        // Auto-clear rate limit after the specified time
        setTimeout(() => {
          get().clearRateLimit();
        }, until - Date.now());
      },

      // Clear rate limit
      clearRateLimit: () => {
        trackWeatherState('clearRateLimit', null);
        set({ 
          rateLimitUntil: null,
          isRateLimited: false
        });
      },

      // Set coordinates
      setCoordinates: (coordinates) => {
        const current = get().currentCoordinates;
        const changed = !current || 
          current.latitude !== coordinates.latitude || 
          current.longitude !== coordinates.longitude;
        
        if (changed) {
          trackWeatherState('setCoordinates', coordinates);
          set({ 
            currentCoordinates: coordinates,
            weatherCacheKey: `weather_${coordinates.latitude}_${coordinates.longitude}`,
            forecastCacheKey: `forecast_${coordinates.latitude}_${coordinates.longitude}`
          });
        }
      },

      // Clear cache (both state and LRU caches)
      clearCache: () => {
        trackWeatherState('clearCache', null);
        weatherCache.clear();
        forecastCache.clear();
        set({ 
          weatherData: null,
          forecastData: [],
          lastFetchTime: null,
          error: null
        });
      },

      // Get cached weather data (checks both state and LRU cache)
      getCachedWeather: () => {
        const state = get();
        
        // First check LRU cache
        if (state.weatherCacheKey) {
          const cached = weatherCache.get(state.weatherCacheKey);
          if (cached) {
            return cached;
          }
        }
        
        // Fallback to state cache
        if (!state.weatherData || !state.lastFetchTime) return null;
        
        // Check if data is still fresh (within 5 minutes)
        const isFresh = Date.now() - state.lastFetchTime < 5 * 60 * 1000;
        return isFresh ? state.weatherData : null;
      },

      // Get cached forecast data (checks both state and LRU cache)
      getCachedForecast: () => {
        const state = get();
        
        // First check LRU cache
        if (state.forecastCacheKey) {
          const cached = forecastCache.get(state.forecastCacheKey);
          if (cached) {
            return cached;
          }
        }
        
        // Fallback to state cache
        if (!state.forecastData || !state.lastFetchTime) return null;
        
        // Check if data is still fresh (within 5 minutes)
        const isFresh = Date.now() - state.lastFetchTime < 5 * 60 * 1000;
        return isFresh ? state.forecastData : null;
      },

      // Fetch weather data with rate limiting and caching
      fetchWeatherData: async (coordinates) => {
        const state = get();
        
        // Set coordinates
        get().setCoordinates(coordinates);
        
        // Check if we're rate limited
        if (state.isRateLimited && state.rateLimitUntil && Date.now() < state.rateLimitUntil) {
          console.log('🌤️ [WeatherStore] Rate limited, using cached weather data');
          return state.getCachedWeather();
        }

        if (state.lastFetchTime && Date.now() - state.lastFetchTime < MIN_WEATHER_FETCH_INTERVAL_MS) {
          console.log('🌤️ [WeatherStore] Skipping weather fetch due to minimum interval');
          return state.getCachedWeather() ?? state.weatherData;
        }
        
        // Check if we have recent cached data (within 5 minutes)
        const cachedWeather = state.getCachedWeather();
        if (cachedWeather) {
          console.log('🌤️ [WeatherStore] Using cached weather data (fresh)');
          return cachedWeather;
        }
        
        // Check if we have any cached data (within 15 minutes)
        if (state.weatherData && state.lastFetchTime && Date.now() - state.lastFetchTime < 15 * 60 * 1000) {
          console.log('🌤️ [WeatherStore] Using cached weather data (within 15 minutes)');
          return state.weatherData;
        }
        
        // Set loading state
        trackWeatherState('setLoading', { isLoading: true, error: null });
        set({ isLoading: true, error: null });
        
        try {
          console.log('🌤️ [WeatherStore] Fetching fresh weather data for coordinates:', coordinates);
          
          // Fetch weather data from OpenWeatherMap
          const apiKey = import.meta.env['VITE_OPENWEATHERMAP_API_KEY'];
          if (!apiKey) {
            throw new Error('OpenWeatherMap API key not configured');
          }

          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.latitude}&lon=${coordinates.longitude}&appid=${apiKey}&units=metric`
          );

          if (!response.ok) {
            if (response.status === 429) {
              // Rate limited - set rate limit state
              const retryAfter = response.headers.get('Retry-After');
              const retryDelay = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default to 1 minute
              get().setRateLimited(Date.now() + retryDelay);
              
              console.log('🌤️ [WeatherStore] Rate limited by API, will retry after:', retryDelay / 1000, 'seconds');
              return state.getCachedWeather(); // Return cached data if available
            }
            throw new Error(`Weather API error: ${response.status}`);
          }

          const data = await response.json();
          
          const weatherData: WeatherData = {
            temperature: data.main.temp,
            humidity: data.main.humidity,
            windSpeed: data.wind.speed * 3.6, // Convert m/s to km/h
            windDirection: data.wind.deg,
            windGust: data.wind.gust ? data.wind.gust * 3.6 : undefined,
            airPressure: data.main.pressure,
            rainProbability: data.rain ? data.rain['1h'] : undefined,
            uvIndex: undefined, // OpenWeatherMap doesn't provide UV index in basic plan
            visibility: data.visibility / 1000, // Convert m to km
            weatherCondition: data.weather[0].main,
            feelsLikeTemperature: data.main.feels_like,
            sunriseTime: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            sunsetTime: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            timestamp: new Date().toISOString(),
            dataSource: 'OpenWeatherMap API'
          };

          // Update store with new data
          get().setWeatherData(weatherData);
          
          console.log('🌤️ [WeatherStore] Successfully fetched weather data');
          return weatherData;
          
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch weather data';
          console.error('🌤️ [WeatherStore] Error fetching weather data:', errorMessage);
          
          get().setError(errorMessage);
          
          // Return cached data if available
          return state.getCachedWeather();
        }
      },

      // Fetch forecast data with rate limiting and caching
      fetchForecastData: async (coordinates) => {
        const state = get();
        
        // Set coordinates
        get().setCoordinates(coordinates);
        
        // Check if we're rate limited
        if (state.isRateLimited && state.rateLimitUntil && Date.now() < state.rateLimitUntil) {
          console.log('🌤️ [WeatherStore] Rate limited, using cached forecast data');
          return state.getCachedForecast();
        }

        if (state.lastFetchTime && Date.now() - state.lastFetchTime < MIN_FORECAST_FETCH_INTERVAL_MS) {
          console.log('🌤️ [WeatherStore] Skipping forecast fetch due to minimum interval');
          return state.getCachedForecast() ?? state.forecastData;
        }
        
        // Check if we have recent cached data (within 5 minutes)
        const cachedForecast = state.getCachedForecast();
        if (cachedForecast) {
          console.log('🌤️ [WeatherStore] Using cached forecast data (fresh)');
          return cachedForecast;
        }
        
        // Check if we have any cached data (within 15 minutes)
        if (state.forecastData && state.lastFetchTime && Date.now() - state.lastFetchTime < 15 * 60 * 1000) {
          console.log('🌤️ [WeatherStore] Using cached forecast data (within 15 minutes)');
          return state.forecastData;
        }
        
        try {
          console.log('🌤️ [WeatherStore] Fetching fresh forecast data for coordinates:', coordinates);
          
          // Fetch forecast from Open-Meteo (free, no rate limiting)
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`
          );

          if (!response.ok) {
            throw new Error(`Forecast API error: ${response.status}`);
          }

          const data = await response.json();
          
          const forecastData: ForecastData[] = data.daily.time
            .slice(0, 5) // CRITICAL: Limit to 5 days instead of 7 for memory efficiency
            .map((date: string, index: number) => ({
              date,
              temperature: {
                min: data.daily.temperature_2m_min[index],
                max: data.daily.temperature_2m_max[index],
                avg: data.daily.temperature_2m_mean[index]
              },
              humidity: null, // Open-Meteo doesn't provide humidity in daily forecast
              windSpeed: data.daily.wind_speed_10m_max[index],
              windDirection: data.daily.wind_direction_10m_dominant[index],
              rainProbability: data.daily.precipitation_probability_max[index],
              weatherCondition: null, // Open-Meteo doesn't provide weather conditions
              uvIndex: undefined
            }));

          // Update store with new data
          get().setForecastData(forecastData);
          
          console.log('🌤️ [WeatherStore] Successfully fetched forecast data');
          return forecastData;
          
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch forecast data';
          console.error('🌤️ [WeatherStore] Error fetching forecast data:', errorMessage);
          
          // Return cached data if available
          return state.getCachedForecast();
        }
      }
    }),
    {
      name: 'breath-safe-weather-store',
    }
  )
);

// Selectors for better performance
export const useWeatherData = () => useWeatherStore((state) => state.weatherData);
export const useForecastData = () => useWeatherStore((state) => state.forecastData);
export const useWeatherLoading = () => useWeatherStore((state) => state.isLoading);
export const useWeatherError = () => useWeatherStore((state) => state.error);
export const useWeatherCoordinates = () => useWeatherStore((state) => state.currentCoordinates);
export const useWeatherRateLimited = () => useWeatherStore((state) => state.isRateLimited);
