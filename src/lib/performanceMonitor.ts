/**
 * Performance Monitoring Utility for Breath Safe
 * 
 * Features:
 * - Operation timing and performance tracking
 * - Memory usage monitoring
 * - Bundle size analysis
 * - Performance bottleneck identification
 * - Automatic performance logging
 */

import { logger, logPerformance } from './logger';
import { LOGGING_CONFIG, shouldLogPerformance } from '@/config/logging';
import { createSafeInterval, CancelSafeInterval } from '@/utils/safeTimers';

const hasWindow = typeof window !== 'undefined';
const performanceAny: (Performance & { memory?: any }) | undefined = hasWindow ? (performance as Performance & { memory?: any }) : undefined;
const supportsPerformanceMemory = Boolean(performanceAny?.memory);

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  category: string;
  metadata?: Record<string, any>;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  available: number;
  percentage: number;
}

export interface BundleMetrics {
  mainBundle: number;
  totalSize: number;
  chunkCount: number;
  compressionRatio: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private operationTimers: Map<string, number> = new Map();
  private memoryCheckInterval: CancelSafeInterval | null = null;
  private isMonitoring = false;

  private constructor() {
    this.initializeMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Start memory monitoring if enabled
    if (LOGGING_CONFIG.notifications.showPerformanceWarnings) {
      this.startMemoryMonitoring();
    }

    // Monitor bundle size on load
    this.monitorBundleSize();
  }

  /**
   * Start timing an operation
   */
  public startTimer(operation: string, category: string = 'general'): void {
    if (!this.isMonitoring) return;
    
    const timerKey = `${category}:${operation}`;
    this.operationTimers.set(timerKey, performance.now());
  }

  /**
   * End timing an operation and log if it exceeds thresholds
   */
  public endTimer(operation: string, category: string = 'general', metadata?: Record<string, any>): number {
    if (!this.isMonitoring) return 0;
    
    const timerKey = `${category}:${operation}`;
    const startTime = this.operationTimers.get(timerKey);
    
    if (!startTime) {
      logger.warn('performance', `Timer not found for operation: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.operationTimers.delete(timerKey);

    // Store metric
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      category,
      metadata
    };

    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }
    this.metrics.get(category)!.push(metric);

    // Keep only last 100 metrics per category
    const categoryMetrics = this.metrics.get(category)!;
    if (categoryMetrics.length > 100) {
      categoryMetrics.splice(0, categoryMetrics.length - 100);
    }

    // Log if performance threshold exceeded
    if (shouldLogPerformance(operation, duration)) {
      logPerformance(category, `Operation exceeded performance threshold`, duration, {
        operation,
        threshold: LOGGING_CONFIG.performance.thresholds[operation as keyof typeof LOGGING_CONFIG.performance.thresholds],
        metadata
      });
    }

    return duration;
  }

  /**
   * Monitor memory usage
   */
  private startMemoryMonitoring(): void {
    if (!supportsPerformanceMemory) return;

    if (this.memoryCheckInterval) {
      return;
    }

    this.memoryCheckInterval = createSafeInterval(() => {
      const memoryInfo = this.getMemoryInfo();
      
      if (memoryInfo.percentage > LOGGING_CONFIG.performance.memory.error) {
        logger.error('performance', 'Memory usage critical', {
          used: memoryInfo.used,
          total: memoryInfo.total,
          percentage: memoryInfo.percentage
        });
      } else if (memoryInfo.percentage > LOGGING_CONFIG.performance.memory.warning) {
        logger.warn('performance', 'Memory usage high', {
          used: memoryInfo.used,
          total: memoryInfo.total,
          percentage: memoryInfo.percentage
        });
      }
    }, 30_000, {
      pauseWhenHidden: true,
      onSkip: reason => {
        if (reason === 'hidden') {
          logger.debug('performance', 'Skipping memory check while document hidden');
        }
      }
    });
  }

  /**
   * Get current memory information
   */
  public getMemoryInfo(): MemoryMetrics {
    if (!supportsPerformanceMemory || !performanceAny?.memory) {
      return {
        used: 0,
        total: 0,
        available: 0,
        percentage: 0
      };
    }

    const memory = performanceAny.memory;
    const used = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    const total = memory.totalJSHeapSize / 1024 / 1024; // Convert to MB
    const available = memory.jsHeapSizeLimit / 1024 / 1024; // Convert to MB

    return {
      used: Math.round(used * 100) / 100,
      total: Math.round(total * 100) / 100,
      available: Math.round(available * 100) / 100,
      percentage: Math.round((used / available) * 100)
    };
  }

  /**
   * Monitor bundle size and performance
   */
  private monitorBundleSize(): void {
    if (typeof window === 'undefined') return;

    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.analyzePageLoadPerformance();
      }, 1000);
    });

    // Monitor navigation performance
    if ('navigation' in performance) {
      const navigation = (performance as any).navigation;
      if (navigation.type === navigation.TYPE_NAVIGATE) {
        this.analyzeNavigationPerformance();
      }
    }
  }

  /**
   * Analyze page load performance
   */
  private analyzePageLoadPerformance(): void {
    if (typeof performance.getEntriesByType === 'undefined') return;

    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length === 0) return;

    const navigation = navigationEntries[0] as PerformanceNavigationTiming;
    
    const metrics = {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: 0,
      firstContentfulPaint: 0
    };

    // Get paint timing if available
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-paint') {
        metrics.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime;
      }
    });

    // Log performance metrics
    logPerformance('pageLoad', 'Page load performance analysis', 0, metrics);

    // Check for performance issues
    if (metrics.domContentLoaded > 3000) {
      logger.warn('performance', 'DOM content loaded slowly', { duration: metrics.domContentLoaded });
    }

    if (metrics.loadComplete > 5000) {
      logger.warn('performance', 'Page load completed slowly', { duration: metrics.loadComplete });
    }
  }

  /**
   * Analyze navigation performance
   */
  private analyzeNavigationPerformance(): void {
    if (typeof performance.getEntriesByType === 'undefined') return;

    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length === 0) return;

    const navigation = navigationEntries[0] as PerformanceNavigationTiming;
    const baseline = typeof navigation.startTime === 'number' ? navigation.startTime : 0;
    const totalTime = navigation.loadEventEnd - baseline;

    if (totalTime > 5000) {
      logger.warn('performance', 'Navigation took longer than expected', { duration: totalTime });
    }
  }

  /**
   * Get performance metrics for a category
   */
  public getMetrics(category?: string): PerformanceMetric[] {
    if (category) {
      return this.metrics.get(category) || [];
    }

    const allMetrics: PerformanceMetric[] = [];
    for (const categoryMetrics of this.metrics.values()) {
      allMetrics.push(...categoryMetrics);
    }

    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    totalOperations: number;
    averageDuration: number;
    slowestOperations: PerformanceMetric[];
    memoryUsage: MemoryMetrics;
  } {
    const allMetrics = this.getMetrics();
    const totalOperations = allMetrics.length;
    
    if (totalOperations === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowestOperations: [],
        memoryUsage: this.getMemoryInfo()
      };
    }

    const totalDuration = allMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const averageDuration = totalDuration / totalOperations;

    // Get top 5 slowest operations
    const slowestOperations = allMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    return {
      totalOperations,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowestOperations,
      memoryUsage: this.getMemoryInfo()
    };
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
    this.operationTimers.clear();
  }

  /**
   * Enable/disable monitoring
   */
  public setMonitoring(enabled: boolean): void {
    this.isMonitoring = enabled;
    
    if (!enabled && this.memoryCheckInterval) {
      this.memoryCheckInterval();
      this.memoryCheckInterval = null;
    } else if (enabled && !this.memoryCheckInterval && LOGGING_CONFIG.notifications.showPerformanceWarnings) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Export performance data
   */
  public exportPerformanceData(format: 'json' | 'csv' = 'json'): string {
    const summary = this.getPerformanceSummary();
    
    if (format === 'csv') {
      return this.convertToCSV(summary);
    }
    
    return JSON.stringify(summary, null, 2);
  }

  /**
   * Convert performance data to CSV
   */
  private convertToCSV(summary: any): string {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Operations', summary.totalOperations],
      ['Average Duration (ms)', summary.averageDuration],
      ['Memory Used (MB)', summary.memoryUsage.used],
      ['Memory Total (MB)', summary.memoryUsage.total],
      ['Memory Percentage', summary.memoryUsage.percentage]
    ];

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.memoryCheckInterval) {
      this.memoryCheckInterval();
      this.memoryCheckInterval = null;
    }
    
    this.metrics.clear();
    this.operationTimers.clear();
    this.isMonitoring = false;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience functions
export const startPerformanceTimer = (operation: string, category?: string) => 
  performanceMonitor.startTimer(operation, category);

export const endPerformanceTimer = (operation: string, category?: string, metadata?: Record<string, any>) => 
  performanceMonitor.endTimer(operation, category, metadata);

export const getPerformanceMetrics = (category?: string) => 
  performanceMonitor.getMetrics(category);

export const getPerformanceSummary = () => 
  performanceMonitor.getPerformanceSummary();

export const clearPerformanceMetrics = () => 
  performanceMonitor.clearMetrics();

export default performanceMonitor;
