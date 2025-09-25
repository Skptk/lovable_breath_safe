import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import BackgroundManager from '@/components/BackgroundManager';

const { mockUseWeatherStore, mockWeatherStore } = vi.hoisted(() => {
  const weatherData = {
    temperature: 22,
    humidity: 55,
    windSpeed: 14,
    windDirection: 180,
    weatherCondition: 'Clear',
    timestamp: new Date().toISOString(),
    sunriseTime: '06:30',
    sunsetTime: '19:45',
    dataSource: 'mock'
  };

  const store = {
    weatherData,
    forecastData: [],
    isLoading: false,
    error: null,
    lastFetchTime: Date.now(),
    rateLimitUntil: null,
    isRateLimited: false,
    currentCoordinates: { latitude: 0, longitude: 0 },
    weatherCacheKey: 'weather_0_0',
    forecastCacheKey: 'forecast_0_0',
    fetchWeatherData: vi.fn().mockResolvedValue(weatherData),
    fetchForecastData: vi.fn().mockResolvedValue([]),
    setWeatherData: vi.fn(),
    setForecastData: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    setRateLimited: vi.fn(),
    clearRateLimit: vi.fn(),
    setCoordinates: vi.fn(),
    clearCache: vi.fn(),
    getCachedWeather: vi.fn().mockReturnValue(weatherData),
    getCachedForecast: vi.fn().mockReturnValue([])
  };

  return {
    mockWeatherStore: store,
    mockUseWeatherStore: vi.fn(() => store)
  };
});

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), isDark: false })
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'demo@example.com' },
    session: null,
    loading: false,
    isAuthenticated: true,
    profileValidated: true,
    validationAttempted: true,
    signOut: vi.fn(),
    signUp: vi.fn(),
    validateProfile: vi.fn()
  })
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    locationData: {
      latitude: 37.7749,
      longitude: -122.4194,
      city: 'San Francisco',
      country: 'USA'
    },
    hasUserConsent: true,
    permissionStatus: 'granted',
    requestLocation: vi.fn(),
    getIPBasedLocationAsync: vi.fn()
  })
}));

vi.mock('@/store/weatherStore', () => ({
  useWeatherStore: mockUseWeatherStore
}));

vi.mock('@/utils/errorTracker', () => ({
  debugTracker: {
    trackVariableDeclaration: vi.fn(),
    trackVariableAccess: vi.fn(),
    dumpDebugInfo: vi.fn()
  }
}));

vi.mock('@/lib/logger', () => ({
  logGeolocation: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@/lib/weatherBackgrounds', () => ({
  getBackgroundImage: vi.fn(() => '/weather-backgrounds/partly-cloudy.webp'),
  isNightTime: vi.fn(() => false),
  isSunriseSunsetPeriod: vi.fn(() => false)
}));

describe('BackgroundManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseWeatherStore.mockClear();
    Object.values(mockWeatherStore).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) {
        (value as unknown as { mockClear: () => void }).mockClear();
      }
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders child content without throwing ReferenceErrors', () => {
    const { unmount } = render(
      <BackgroundManager>
        <div data-testid="dashboard-content">dashboard</div>
      </BackgroundManager>
    );

    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    unmount();
  });
});
