/**
 * Professional Logging System for Breath Safe
 * 
 * Features:
 * - Log level control (ERROR, WARN, INFO, DEBUG)
 * - Environment-based filtering (production vs development)
 * - Rate limiting for repeated messages
 * - Structured logging with consistent prefixes
 * - Performance impact monitoring
 * - Memory management with log rotation
 */

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  performance?: {
    duration?: number;
    memory?: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enablePerformanceLogs: boolean;
  maxLogEntries: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  categories: {
    [key: string]: {
      level: LogLevel;
      rateLimit?: number;
    };
  };
}

const getEnvValue = (key: string): string | undefined => {
  const importMetaEnv = typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

  if (importMetaEnv && Object.prototype.hasOwnProperty.call(importMetaEnv, key)) {
    return importMetaEnv[key];
  }

  if (typeof process !== 'undefined' && process.env && Object.prototype.hasOwnProperty.call(process.env, key)) {
    return process.env[key];
  }

  return undefined;
};

class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  private performanceStartTimes: Map<string, number> = new Map();
  private isProduction: boolean;

  private constructor() {
    const mode = getEnvValue('NODE_ENV') ?? getEnvValue('MODE');
    this.isProduction = mode === 'production' || mode === 'prod';

    // Default configuration
    this.config = {
      level: this.isProduction ? 'ERROR' : 'DEBUG',
      enablePerformanceLogs: !this.isProduction,
      maxLogEntries: 1000,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMax: 10, // Max 10 logs per minute per category
      categories: {
        system: { level: 'ERROR' },
        auth: { level: 'WARN' },
        data: { level: 'INFO' },
        ui: { level: 'DEBUG' },
        performance: { level: 'INFO' },
        debug: { level: 'DEBUG' },
        geolocation: { level: 'INFO', rateLimit: 5 }, // Limit geolocation spam
        channel: { level: 'INFO', rateLimit: 3 }, // Limit channel management spam
        navigation: { level: 'DEBUG', rateLimit: 2 }, // Limit navigation spam
        connection: { level: 'WARN', rateLimit: 5 }, // Limit connection spam
        validation: { level: 'INFO', rateLimit: 3 }, // Limit validation spam
      }
    };

    // Load configuration from environment
    this.loadConfig();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private loadConfig(): void {
    // Load from environment variables
    const envLevel = getEnvValue('LOG_LEVEL') as LogLevel | undefined;
    if (envLevel && ['ERROR', 'WARN', 'INFO', 'DEBUG'].includes(envLevel)) {
      this.config.level = envLevel;
    }

    const enablePerformance = getEnvValue('ENABLE_PERFORMANCE_LOGS');
    if (enablePerformance !== undefined) {
      this.config.enablePerformanceLogs = enablePerformance === 'true';
    }

    const maxEntries = getEnvValue('MAX_LOG_ENTRIES');
    if (maxEntries) {
      this.config.maxLogEntries = parseInt(maxEntries, 10);
    }
  }

  private shouldLog(level: LogLevel, category: string): boolean {
    // Check log level
    const levelPriority = { ERROR: 4, WARN: 3, INFO: 2, DEBUG: 1 };
    if (levelPriority[level] < levelPriority[this.config.level]) {
      return false;
    }

    // Check category level
    const categoryConfig = this.config.categories[category];
    if (categoryConfig && levelPriority[level] < levelPriority[categoryConfig.level]) {
      return false;
    }

    // Check rate limiting
    if (this.isRateLimited(category)) {
      return false;
    }

    return true;
  }

  private isRateLimited(category: string): boolean {
    const categoryConfig = this.config.categories[category];
    if (!categoryConfig?.rateLimit) {
      return false;
    }

    const now = Date.now();
    const key = `${category}:${Math.floor(now / this.config.rateLimitWindow)}`;
    const current = this.rateLimitMap.get(key);

    if (!current) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + this.config.rateLimitWindow });
      return false;
    }

    if (now > current.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + this.config.rateLimitWindow });
      return false;
    }

    if (current.count >= (categoryConfig.rateLimit || this.config.rateLimitMax)) {
      return true;
    }

    current.count++;
    return false;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Rotate logs if exceeding maximum
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Clean up old rate limit entries
    const now = Date.now();
    for (const [key, value] of this.rateLimitMap.entries()) {
      if (now > value.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  private formatMessage(level: LogLevel, category: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${category.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  public startPerformanceTimer(key: string): void {
    if (!this.config.enablePerformanceLogs) return;
    this.performanceStartTimes.set(key, performance.now());
  }

  public endPerformanceTimer(key: string): number | null {
    if (!this.config.enablePerformanceLogs) return null;
    
    const startTime = this.performanceStartTimes.get(key);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.performanceStartTimes.delete(key);
    
    return duration;
  }

  public error(category: string, message: string, data?: any): void {
    if (!this.shouldLog('ERROR', category)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category,
      message,
      data
    };

    this.addLog(entry);
    
    // Always log errors to console
    console.error(this.formatMessage('ERROR', category, message, data));
  }

  public warn(category: string, message: string, data?: any): void {
    if (!this.shouldLog('WARN', category)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      category,
      message,
      data
    };

    this.addLog(entry);
    
    if (!this.isProduction) {
      console.warn(this.formatMessage('WARN', category, message, data));
    }
  }

  public info(category: string, message: string, data?: any): void {
    if (!this.shouldLog('INFO', category)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category,
      message,
      data
    };

    this.addLog(entry);
    
    if (!this.isProduction) {
      console.info(this.formatMessage('INFO', category, message, data));
    }
  }

  public debug(category: string, message: string, data?: any): void {
    if (!this.shouldLog('DEBUG', category)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      category,
      message,
      data
    };

    this.addLog(entry);
    
    if (!this.isProduction) {
      console.debug(this.formatMessage('DEBUG', category, message, data));
    }
  }

  public performance(category: string, message: string, duration?: number, data?: any): void {
    if (!this.config.enablePerformanceLogs) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: 'performance',
      message,
      data,
      performance: { duration }
    };

    this.addLog(entry);
    
    if (!this.isProduction) {
      console.info(`[PERFORMANCE] [${category.toUpperCase()}] ${message}${duration ? ` (${duration.toFixed(2)}ms)` : ''}`);
    }
  }

  public getLogs(level?: LogLevel, category?: string, limit?: number): LogEntry[] {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  public clearLogs(): void {
    this.logs = [];
    this.rateLimitMap.clear();
    this.performanceStartTimes.clear();
  }

  public getStats(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByCategory: Record<string, number>;
    rateLimitStatus: Record<string, { count: number; resetTime: number }>;
  } {
    const logsByLevel: Record<LogLevel, number> = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
    const logsByCategory: Record<string, number> = {};

    for (const log of this.logs) {
      logsByLevel[log.level]++;
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;
    }

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByCategory,
      rateLimitStatus: Object.fromEntries(this.rateLimitMap)
    };
  }

  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions for common use cases
export const logError = (category: string, message: string, data?: any) => logger.error(category, message, data);
export const logWarn = (category: string, message: string, data?: any) => logger.warn(category, message, data);
export const logInfo = (category: string, message: string, data?: any) => logger.info(category, message, data);
export const logDebug = (category: string, message: string, data?: any) => logger.debug(category, message, data);
export const logPerformance = (category: string, message: string, duration?: number, data?: any) => logger.performance(category, message, duration, data);

// Performance timing helpers
export const startTimer = (key: string) => logger.startPerformanceTimer(key);
export const endTimer = (key: string) => logger.endPerformanceTimer(key);

// Category-specific logging helpers
export const logSystem = {
  error: (message: string, data?: any) => logger.error('system', message, data),
  warn: (message: string, data?: any) => logger.warn('system', message, data),
  info: (message: string, data?: any) => logger.info('system', message, data),
  debug: (message: string, data?: any) => logger.debug('system', message, data)
};

export const logAuth = {
  error: (message: string, data?: any) => logger.error('auth', message, data),
  warn: (message: string, data?: any) => logger.warn('auth', message, data),
  info: (message: string, data?: any) => logger.info('auth', message, data),
  debug: (message: string, data?: any) => logger.debug('auth', message, data)
};

export const logData = {
  error: (message: string, data?: any) => logger.error('data', message, data),
  warn: (message: string, data?: any) => logger.warn('data', message, data),
  info: (message: string, data?: any) => logger.info('data', message, data),
  debug: (message: string, data?: any) => logger.debug('data', message, data)
};

export const logUI = {
  error: (message: string, data?: any) => logger.error('ui', message, data),
  warn: (message: string, data?: any) => logger.warn('ui', message, data),
  info: (message: string, data?: any) => logger.info('ui', message, data),
  debug: (message: string, data?: any) => logger.debug('ui', message, data)
};

export const logGeolocation = {
  error: (message: string, data?: any) => logger.error('geolocation', message, data),
  warn: (message: string, data?: any) => logger.warn('geolocation', message, data),
  info: (message: string, data?: any) => logger.info('geolocation', message, data),
  debug: (message: string, data?: any) => logger.debug('geolocation', message, data)
};

export const logChannel = {
  error: (message: string, data?: any) => logger.error('channel', message, data),
  warn: (message: string, data?: any) => logger.warn('channel', message, data),
  info: (message: string, data?: any) => logger.info('channel', message, data),
  debug: (message: string, data?: any) => logger.debug('channel', message, data)
};

export const logNavigation = {
  error: (message: string, data?: any) => logger.error('navigation', message, data),
  warn: (message: string, data?: any) => logger.warn('navigation', message, data),
  info: (message: string, data?: any) => logger.info('navigation', message, data),
  debug: (message: string, data?: any) => logger.debug('navigation', message, data)
};

export const logConnection = {
  error: (message: string, data?: any) => logger.error('connection', message, data),
  warn: (message: string, data?: any) => logger.warn('connection', message, data),
  info: (message: string, data?: any) => logger.info('connection', message, data),
  debug: (message: string, data?: any) => logger.debug('connection', message, data)
};

export const logValidation = {
  error: (message: string, data?: any) => logger.error('validation', message, data),
  warn: (message: string, data?: any) => logger.warn('validation', message, data),
  info: (message: string, data?: any) => logger.info('validation', message, data),
  debug: (message: string, data?: any) => logger.debug('validation', message, data)
};

export default logger;
