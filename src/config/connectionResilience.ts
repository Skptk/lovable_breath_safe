// Connection Resilience Configuration
// Conservative defaults to prevent notification spam and improve user experience

export const CONNECTION_RESILIENCE_CONFIG = {
  // REDUCE frequency to prevent spam
  HEARTBEAT_INTERVAL: 60000,        // 60 seconds (was 30)
  HEARTBEAT_TIMEOUT: 30000,         // 30 seconds (was 10)
  MAX_RECONNECT_ATTEMPTS: 3,        // 3 attempts (was 5)
  RECONNECT_BASE_DELAY: 2000,       // 2 seconds (was 1)
  NOTIFICATION_COOLDOWN: 15000,     // 15 seconds between duplicates
  MAX_NOTIFICATIONS: 2,             // Maximum 2 notifications
  
  // Disable heartbeat in production for now
  ENABLE_HEARTBEAT: process.env.NODE_ENV === 'development',
  
  // Connection monitoring settings
  CONNECTION_CHECK_INTERVAL: 60000,  // 60 seconds
  MAX_CONNECTION_ERRORS: 5,          // Maximum errors to track
  
  // Network detection settings
  ENABLE_NETWORK_DETECTION: true,
  NETWORK_CHANGE_DEBOUNCE: 1000,     // 1 second debounce
  
  // UI settings
  SHOW_DEBUG_PANEL: process.env.NODE_ENV === 'development',
  ALERT_AUTO_HIDE: 5000,            // 5 seconds
  NOTIFICATION_PRIORITIES: {
    HIGH: 8000,      // 8 seconds
    NORMAL: 5000,    // 5 seconds
    LOW: 3000        // 3 seconds
  }
} as const;

// Environment-specific overrides
export const getConnectionConfig = () => {
  const baseConfig = { ...CONNECTION_RESILIENCE_CONFIG };
  
  // Development overrides
  if (process.env.NODE_ENV === 'development') {
    baseConfig.HEARTBEAT_INTERVAL = 30000;        // 30 seconds in dev
    baseConfig.HEARTBEAT_TIMEOUT = 15000;         // 15 seconds in dev
    baseConfig.SHOW_DEBUG_PANEL = true;
  }
  
  // Production overrides
  if (process.env.NODE_ENV === 'production') {
    baseConfig.ENABLE_HEARTBEAT = false;          // Disable heartbeat in production
    baseConfig.SHOW_DEBUG_PANEL = false;
    baseConfig.MAX_NOTIFICATIONS = 1;             // Only 1 notification in production
  }
  
  return baseConfig;
};

// Quick fix option - emergency fallback configuration
export const EMERGENCY_FALLBACK_CONFIG = {
  ENABLE_HEARTBEAT: false,
  ENABLE_NETWORK_DETECTION: false,
  MAX_NOTIFICATIONS: 1,
  NOTIFICATION_COOLDOWN: 30000,     // 30 seconds between notifications
  SHOW_DEBUG_PANEL: false
} as const;
