import { vi } from 'vitest';
import type { WeatherStore, WeatherData } from '@/store/weatherStore';

const createDefaultWeather = (): WeatherData => ({
  temperature: 22,
  humidity: 55,
  windSpeed: 14,
  windDirection: 180,
  weatherCondition: 'Clear',
  timestamp: new Date().toISOString(),
  dataSource: 'mock',
});

const createMockWeatherStore = (overrides: Partial<WeatherStore> = {}): WeatherStore => ({
  weatherData: createDefaultWeather(),
  forecastData: [],
  isLoading: false,
  error: null,
  lastFetchTime: Date.now(),
  rateLimitUntil: null,
  isRateLimited: false,
  currentCoordinates: { latitude: 0, longitude: 0 },
  weatherCacheKey: 'weather_0_0',
  forecastCacheKey: 'forecast_0_0',
  fetchWeatherData: vi.fn().mockResolvedValue(createDefaultWeather()),
  fetchForecastData: vi.fn().mockResolvedValue([]),
  setWeatherData: vi.fn(),
  setForecastData: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  setRateLimited: vi.fn(),
  clearRateLimit: vi.fn(),
  setCoordinates: vi.fn(),
  clearCache: vi.fn(),
  getCachedWeather: vi.fn().mockReturnValue(createDefaultWeather()),
  getCachedForecast: vi.fn().mockReturnValue([]),
  ...overrides,
});

export const mockWeatherStore = createMockWeatherStore();
export const mockUseWeatherStore = vi.fn(() => mockWeatherStore);

export const resetWeatherStoreMock = () => {
  const freshStore = createMockWeatherStore();
  Object.keys(freshStore).forEach((key) => {
    (mockWeatherStore as any)[key] = (freshStore as any)[key];
  });
};
