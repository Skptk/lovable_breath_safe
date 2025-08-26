/**
 * Logging Configuration for Breath Safe
 * 
 * This file contains all logging configuration settings including:
 * - Environment-specific log levels
 * - Performance monitoring thresholds
 * - Rate limiting settings
 * - Category-specific configurations
 */

export const LOGGING_CONFIG = {
  // Environment-based configuration
  development: {
    level: 'DEBUG' as const,
    enablePerformanceLogs: true,
    maxLogEntries: 2000,
    rateLimitWindow: 30000, // 30 seconds
    rateLimitMax: 20, // Max 20 logs per 30 seconds per category
  },
  production: {
    level: 'ERROR' as const,
    enablePerformanceLogs: false,
    maxLogEntries: 1000,
    rateLimitWindow: 60000, // 1 minute
    rateLimitMax: 10, // Max 10 logs per minute per category
  },
  
  // Category-specific rate limiting
  categories: {
    geolocation: {
      level: 'INFO' as const,
      rateLimit: 5, // Max 5 logs per window
      description: 'Location services and GPS operations'
    },
    channel: {
      level: 'INFO' as const,
      rateLimit: 3, // Max 3 logs per window
      description: 'WebSocket channel management'
    },
    navigation: {
      level: 'DEBUG' as const,
      rateLimit: 2, // Max 2 logs per window
      description: 'Page navigation and routing'
    },
    connection: {
      level: 'WARN' as const,
      rateLimit: 5, // Max 5 logs per window
      description: 'Connection health and WebSocket status'
    },
    validation: {
      level: 'INFO' as const,
      rateLimit: 3, // Max 3 logs per window
      description: 'Data validation and form processing'
    },
    data: {
      level: 'INFO' as const,
      rateLimit: 10, // Max 10 logs per window
      description: 'API calls and data operations'
    },
    ui: {
      level: 'DEBUG' as const,
      rateLimit: 5, // Max 5 logs per window
      description: 'User interface interactions'
    },
    system: {
      level: 'ERROR' as const,
      rateLimit: 20, // Max 20 logs per window
      description: 'System-level operations and errors'
    },
    auth: {
      level: 'WARN' as const,
      rateLimit: 10, // Max 10 logs per window
      description: 'Authentication and authorization'
    },
    performance: {
      level: 'INFO' as const,
      rateLimit: 15, // Max 15 logs per window
      description: 'Performance metrics and timing'
    }
  },
  
  // Performance monitoring thresholds
  performance: {
    // Log operations that take longer than these thresholds
    thresholds: {
      geolocation: 5000, // 5 seconds
      weatherFetch: 3000, // 3 seconds
      channelSubscription: 2000, // 2 seconds
      navigation: 1000, // 1 second
      dataValidation: 500, // 500ms
    },
    
    // Memory usage thresholds (MB)
    memory: {
      warning: 100, // Warn if memory usage exceeds 100MB
      error: 200, // Error if memory usage exceeds 200MB
    },
    
    // Bundle size thresholds (KB)
    bundle: {
      warning: 300, // Warn if main bundle exceeds 300KB
      error: 500, // Error if main bundle exceeds 500KB
    }
  },
  
  // Notification and alert settings
  notifications: {
    // Show performance warnings in development
    showPerformanceWarnings: process.env.NODE_ENV === 'development',
    
    // Alert on critical errors
    alertOnCriticalErrors: true,
    
    // Maximum notifications to show simultaneously
    maxSimultaneous: 3,
    
    // Auto-hide duration for different log levels
    autoHide: {
      ERROR: 10000, // 10 seconds
      WARN: 8000,   // 8 seconds
      INFO: 5000,   // 5 seconds
      DEBUG: 3000,  // 3 seconds
    }
  },
  
  // Security and privacy settings
  security: {
    // Never log sensitive data
    sensitiveFields: [
      'password',
      'token',
      'apiKey',
      'secret',
      'privateKey',
      'sessionId',
      'userId',
      'email'
    ],
    
    // Sanitize data before logging
    sanitizeData: true,
    
    // Mask sensitive values
    maskPatterns: {
      email: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      phone: /(\d{3})-(\d{3})-(\d{4})/g,
      creditCard: /(\d{4})-(\d{4})-(\d{4})-(\d{4})/g
    }
  },
  
  // Export and reporting settings
  export: {
    // Enable log export functionality
    enabled: process.env.NODE_ENV === 'development',
    
    // Export formats
    formats: ['json', 'csv', 'txt'],
    
    // Maximum export size (MB)
    maxExportSize: 10,
    
    // Auto-export on errors
    autoExportOnErrors: true,
    
    // Export retention (days)
    retentionDays: 30
  }
} as const;

// Helper function to get current environment configuration
export const getCurrentLoggingConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return LOGGING_CONFIG[env as keyof typeof LOGGING_CONFIG] || LOGGING_CONFIG.development;
};

// Helper function to check if logging is enabled for a category
export const isLoggingEnabled = (category: string, level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG') => {
  const config = getCurrentLoggingConfig();
  const categoryConfig = LOGGING_CONFIG.categories[category as keyof typeof LOGGING_CONFIG.categories];
  
  if (!categoryConfig) return true; // Default to enabled if no category config
  
  const levelPriority = { ERROR: 4, WARN: 3, INFO: 2, DEBUG: 1 };
  const configLevel = LOGGING_CONFIG.categories[category as keyof typeof LOGGING_CONFIG.categories]?.level || 'DEBUG';
  
  return levelPriority[level] >= levelPriority[configLevel];
};

// Helper function to get rate limit for a category
export const getCategoryRateLimit = (category: string) => {
  const categoryConfig = LOGGING_CONFIG.categories[category as keyof typeof LOGGING_CONFIG.categories];
  return categoryConfig?.rateLimit || getCurrentLoggingConfig().rateLimitMax;
};

// Performance monitoring helpers
export const shouldLogPerformance = (operation: string, duration: number) => {
  const threshold = LOGGING_CONFIG.performance.thresholds[operation as keyof typeof LOGGING_CONFIG.performance.thresholds];
  return threshold ? duration > threshold : false;
};

// Security helpers
export const sanitizeLogData = (data: any): any => {
  if (!LOGGING_CONFIG.security.sanitizeData) return data;
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      if (LOGGING_CONFIG.security.sensitiveFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  return data;
};

export default LOGGING_CONFIG;
