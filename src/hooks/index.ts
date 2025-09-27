// Core hooks
export { useAuth } from './useAuth';
export { useAirQuality } from './useAirQuality';
export { useWeatherData } from './useWeatherData';
export { useGeolocation } from './useGeolocation';
export { useNotifications } from './useNotifications';
export { useUserPoints } from './useUserPoints';
export { useAchievements } from './useAchievements';
export { useWithdrawalRequests } from './useWithdrawalRequests';

// WebSocket stability hooks
export { useStableChannelSubscription } from './useStableChannelSubscription';
export { useMemorySafeSubscription } from './useMemorySafeSubscription';
export { useConnectionHealth } from './useConnectionHealth';
export { useEnhancedConnectionHealth } from './useEnhancedConnectionHealth';
export { useSimplifiedConnectionHealth } from './useSimplifiedConnectionHealth';
export { useRealtimeStatus } from './useRealtimeStatus';

// Utility hooks
export { useRefreshCountdown } from './useRefreshCountdown';
export { useGlobalSearch } from './useGlobalSearch';
export { useProfileValidation } from './useProfileValidation';
export { usePerformanceMonitor, useDebounce, useThrottle } from './usePerformance';
export { useIsMobile } from './use-mobile';
export { useToast } from './use-toast';
export { useGracefulRealtime } from './useGracefulRealtime';
export { default as useGlobalEnvironmentalData } from './useGlobalEnvironmentalData';
export { useOptimizedMessageHandling } from './useOptimizedMessageHandling';
export { useReflowOptimization } from './useReflowOptimization';
