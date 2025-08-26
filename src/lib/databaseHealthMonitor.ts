import { logConnection } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

// Database Health Monitoring System
// Tracks connection health, performance metrics, and provides early warnings

interface DatabaseMetrics {
  connectionLatency: number;
  queryResponseTime: number;
  errorRate: number;
  activeConnections: number;
  connectionPoolSize: number;
  lastHealthCheck: number;
  healthScore: number;
}

interface HealthThresholds {
  maxLatency: number;
  maxQueryTime: number;
  maxErrorRate: number;
  minHealthScore: number;
  checkInterval: number;
  warningThreshold: number;
  criticalThreshold: number;
}

interface HealthAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: number;
  metrics: Partial<DatabaseMetrics>;
  resolved: boolean;
}

export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private metrics: DatabaseMetrics = {
    connectionLatency: 0,
    queryResponseTime: 0,
    errorRate: 0,
    activeConnections: 0,
    connectionPoolSize: 0,
    lastHealthCheck: 0,
    healthScore: 100
  };

  private thresholds: HealthThresholds = {
    maxLatency: 5000,        // 5 seconds
    maxQueryTime: 10000,     // 10 seconds
    maxErrorRate: 0.1,       // 10%
    minHealthScore: 70,      // 70%
    checkInterval: 30000,    // 30 seconds
    warningThreshold: 80,    // 80%
    criticalThreshold: 60    // 60%
  };

  private alerts: Map<string, HealthAlert> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private connectionHistory: Array<{ timestamp: number; latency: number; success: boolean }> = [];
  private maxHistorySize = 100;

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  // Start health monitoring
  private startMonitoring(): void {
    try {
      if (this.isMonitoring) return;

      this.isMonitoring = true;
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, this.thresholds.checkInterval);

      logConnection.info('DatabaseHealthMonitor: Health monitoring started');
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to start monitoring:', error);
    }
  }

  // Stop health monitoring
  stopMonitoring(): void {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      this.isMonitoring = false;
      logConnection.info('DatabaseHealthMonitor: Health monitoring stopped');
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to stop monitoring:', error);
    }
  }

  // Perform comprehensive health check
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Test database connection
      const connectionResult = await this.testConnection();
      
      // Test query performance
      const queryResult = await this.testQueryPerformance();
      
      // Update metrics
      this.updateMetrics(connectionResult, queryResult);
      
      // Calculate health score
      this.calculateHealthScore();
      
      // Check for alerts
      this.checkAlerts();
      
      // Log health status
      this.logHealthStatus();
      
      this.metrics.lastHealthCheck = Date.now();
      
      const checkDuration = Date.now() - startTime;
      logConnection.debug(`DatabaseHealthMonitor: Health check completed in ${checkDuration}ms`);
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Health check failed:', error);
      this.metrics.healthScore = 0;
    }
  }

  // Test database connection
  private async testConnection(): Promise<{ success: boolean; latency: number; error?: any }> {
    try {
      const startTime = Date.now();
      
      // Simple connection test - select 1
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        return { success: false, latency, error };
      }
      
      return { success: true, latency };
    } catch (error) {
      const latency = Date.now() - Date.now(); // 0 latency for failed connections
      return { success: false, latency, error };
    }
  }

  // Test query performance
  private async testQueryPerformance(): Promise<{ success: boolean; responseTime: number; error?: any }> {
    try {
      const startTime = Date.now();
      
      // Test a more complex query
      const { data, error } = await supabase
        .from('air_quality_readings')
        .select('id, aqi_value, timestamp')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        return { success: false, responseTime, error };
      }
      
      return { success: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - Date.now(); // 0 response time for failed queries
      return { success: false, responseTime, error };
    }
  }

  // Update metrics based on health check results
  private updateMetrics(connectionResult: any, queryResult: any): void {
    try {
      // Update connection latency
      if (connectionResult.success) {
        this.metrics.connectionLatency = connectionResult.latency;
        this.addToHistory(connectionResult.latency, true);
      } else {
        this.addToHistory(0, false);
      }

      // Update query response time
      if (queryResult.success) {
        this.metrics.queryResponseTime = queryResult.responseTime;
      }

      // Calculate error rate from history
      this.calculateErrorRate();

      // Update connection pool info (simulated)
      this.metrics.connectionPoolSize = 10; // Simulated pool size
      this.metrics.activeConnections = Math.floor(Math.random() * 5) + 1; // Simulated active connections
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to update metrics:', error);
    }
  }

  // Add connection result to history
  private addToHistory(latency: number, success: boolean): void {
    try {
      this.connectionHistory.push({
        timestamp: Date.now(),
        latency,
        success
      });

      // Keep history size manageable
      if (this.connectionHistory.length > this.maxHistorySize) {
        this.connectionHistory.shift();
      }
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to add to history:', error);
    }
  }

  // Calculate error rate from history
  private calculateErrorRate(): void {
    try {
      if (this.connectionHistory.length === 0) {
        this.metrics.errorRate = 0;
        return;
      }

      const recentHistory = this.connectionHistory.filter(
        entry => Date.now() - entry.timestamp < 5 * 60 * 1000 // Last 5 minutes
      );

      if (recentHistory.length === 0) {
        this.metrics.errorRate = 0;
        return;
      }

      const failedConnections = recentHistory.filter(entry => !entry.success).length;
      this.metrics.errorRate = failedConnections / recentHistory.length;
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to calculate error rate:', error);
    }
  }

  // Calculate overall health score
  private calculateHealthScore(): void {
    try {
      let score = 100;

      // Deduct points for high latency
      if (this.metrics.connectionLatency > this.thresholds.maxLatency) {
        const latencyPenalty = Math.min(30, (this.metrics.connectionLatency - this.thresholds.maxLatency) / 1000 * 10);
        score -= latencyPenalty;
      }

      // Deduct points for slow queries
      if (this.metrics.queryResponseTime > this.thresholds.maxQueryTime) {
        const queryPenalty = Math.min(25, (this.metrics.queryResponseTime - this.thresholds.maxQueryTime) / 1000 * 5);
        score -= queryPenalty;
      }

      // Deduct points for high error rate
      if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
        const errorPenalty = Math.min(40, this.metrics.errorRate * 100);
        score -= errorPenalty;
      }

      // Ensure score is within bounds
      this.metrics.healthScore = Math.max(0, Math.min(100, score));
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to calculate health score:', error);
    }
  }

  // Check for health alerts
  private checkAlerts(): void {
    try {
      const alerts: HealthAlert[] = [];

      // Check for critical health score
      if (this.metrics.healthScore <= this.thresholds.criticalThreshold) {
        alerts.push({
          id: `critical_health_${Date.now()}`,
          type: 'critical',
          message: `Database health is critical: ${this.metrics.healthScore.toFixed(1)}%`,
          timestamp: Date.now(),
          metrics: { healthScore: this.metrics.healthScore },
          resolved: false
        });
      }

      // Check for warning health score
      if (this.metrics.healthScore <= this.thresholds.warningThreshold && 
          this.metrics.healthScore > this.thresholds.criticalThreshold) {
        alerts.push({
          id: `warning_health_${Date.now()}`,
          type: 'warning',
          message: `Database health is degraded: ${this.metrics.healthScore.toFixed(1)}%`,
          timestamp: Date.now(),
          metrics: { healthScore: this.metrics.healthScore },
          resolved: false
        });
      }

      // Check for high latency
      if (this.metrics.connectionLatency > this.thresholds.maxLatency) {
        alerts.push({
          id: `high_latency_${Date.now()}`,
          type: 'warning',
          message: `High connection latency: ${this.metrics.connectionLatency}ms`,
          timestamp: Date.now(),
          metrics: { connectionLatency: this.metrics.connectionLatency },
          resolved: false
        });
      }

      // Check for high error rate
      if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
        alerts.push({
          id: `high_error_rate_${Date.now()}`,
          type: 'warning',
          message: `High error rate: ${(this.metrics.errorRate * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          metrics: { errorRate: this.metrics.errorRate },
          resolved: false
        });
      }

      // Add new alerts
      alerts.forEach(alert => {
        if (!this.alerts.has(alert.id)) {
          this.alerts.set(alert.id, alert);
          this.logAlert(alert);
        }
      });

      // Resolve old alerts if conditions improved
      this.resolveOldAlerts();
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to check alerts:', error);
    }
  }

  // Log health alert
  private logAlert(alert: HealthAlert): void {
    try {
      switch (alert.type) {
        case 'critical':
          logConnection.error(`DatabaseHealthMonitor: ${alert.message}`, alert.metrics);
          break;
        case 'warning':
          logConnection.warn(`DatabaseHealthMonitor: ${alert.message}`, alert.metrics);
          break;
        case 'info':
          logConnection.info(`DatabaseHealthMonitor: ${alert.message}`, alert.metrics);
          break;
      }
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to log alert:', error);
    }
  }

  // Resolve old alerts when conditions improve
  private resolveOldAlerts(): void {
    try {
      const now = Date.now();
      const resolvedAlerts: string[] = [];

      for (const [id, alert] of this.alerts) {
        if (alert.resolved) continue;

        let shouldResolve = false;

        // Resolve health score alerts if improved
        if (alert.message.includes('health') && this.metrics.healthScore > this.thresholds.warningThreshold) {
          shouldResolve = true;
        }

        // Resolve latency alerts if improved
        if (alert.message.includes('latency') && this.metrics.connectionLatency <= this.thresholds.maxLatency) {
          shouldResolve = true;
        }

        // Resolve error rate alerts if improved
        if (alert.message.includes('error rate') && this.metrics.errorRate <= this.thresholds.maxErrorRate) {
          shouldResolve = true;
        }

        // Resolve old alerts (older than 5 minutes)
        if (now - alert.timestamp > 5 * 60 * 1000) {
          shouldResolve = true;
        }

        if (shouldResolve) {
          alert.resolved = true;
          resolvedAlerts.push(id);
          logConnection.info(`DatabaseHealthMonitor: Alert resolved: ${alert.message}`);
        }
      }

      // Clean up resolved alerts
      resolvedAlerts.forEach(id => {
        this.alerts.delete(id);
      });
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to resolve old alerts:', error);
    }
  }

  // Log health status
  private logHealthStatus(): void {
    try {
      const status = this.getHealthStatus();
      
      if (status === 'healthy') {
        logConnection.debug('DatabaseHealthMonitor: Database health is good', this.metrics);
      } else if (status === 'degraded') {
        logConnection.warn('DatabaseHealthMonitor: Database health is degraded', this.metrics);
      } else {
        logConnection.error('DatabaseHealthMonitor: Database health is critical', this.metrics);
      }
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to log health status:', error);
    }
  }

  // Get current health status
  getHealthStatus(): 'healthy' | 'degraded' | 'critical' {
    if (this.metrics.healthScore <= this.thresholds.criticalThreshold) {
      return 'critical';
    } else if (this.metrics.healthScore <= this.thresholds.warningThreshold) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  // Get current metrics
  getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  // Get active alerts
  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  // Get health summary
  getHealthSummary(): {
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    alerts: number;
    lastCheck: number;
    recommendations: string[];
  } {
    const status = this.getHealthStatus();
    const activeAlerts = this.getActiveAlerts();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (this.metrics.connectionLatency > this.thresholds.maxLatency) {
      recommendations.push('Consider optimizing database queries or increasing connection pool size');
    }

    if (this.metrics.errorRate > this.thresholds.maxErrorRate) {
      recommendations.push('Investigate connection failures and network issues');
    }

    if (this.metrics.healthScore < this.thresholds.minHealthScore) {
      recommendations.push('Database performance needs immediate attention');
    }

    return {
      status,
      score: this.metrics.healthScore,
      alerts: activeAlerts.length,
      lastCheck: this.metrics.lastHealthCheck,
      recommendations
    };
  }

  // Configure thresholds
  configureThresholds(newThresholds: Partial<HealthThresholds>): void {
    try {
      this.thresholds = { ...this.thresholds, ...newThresholds };
      logConnection.info('DatabaseHealthMonitor: Thresholds updated', this.thresholds);
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to configure thresholds:', error);
    }
  }

  // Force health check
  async forceHealthCheck(): Promise<void> {
    try {
      logConnection.info('DatabaseHealthMonitor: Forcing health check...');
      await this.performHealthCheck();
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Forced health check failed:', error);
    }
  }

  // Clear all alerts
  clearAlerts(): void {
    try {
      this.alerts.clear();
      logConnection.info('DatabaseHealthMonitor: All alerts cleared');
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to clear alerts:', error);
    }
  }

  // Destroy the monitor
  destroy(): void {
    try {
      this.stopMonitoring();
      this.alerts.clear();
      this.connectionHistory.length = 0;
      DatabaseHealthMonitor.instance = null as any;
      logConnection.info('DatabaseHealthMonitor: Destroyed');
    } catch (error) {
      logConnection.error('DatabaseHealthMonitor: Failed to destroy:', error);
    }
  }
}

// Export singleton instance
export const databaseHealthMonitor = DatabaseHealthMonitor.getInstance();

// Utility functions
export const getDatabaseHealth = () => databaseHealthMonitor.getHealthStatus();
export const getDatabaseMetrics = () => databaseHealthMonitor.getMetrics();
export const getDatabaseAlerts = () => databaseHealthMonitor.getActiveAlerts();
export const getDatabaseSummary = () => databaseHealthMonitor.getHealthSummary();
export const forceDatabaseHealthCheck = () => databaseHealthMonitor.forceHealthCheck();
export const configureDatabaseThresholds = (thresholds: Partial<HealthThresholds>) => 
  databaseHealthMonitor.configureThresholds(thresholds);
