/**
 * WebSocket Connection Health Monitor for Breath Safe
 * 
 * Features:
 * - Connection health monitoring
 * - Exponential backoff retry logic
 * - Code 1011 disconnect handling
 * - Connection quality assessment
 * - Automatic reconnection strategies
 */

import { logConnection } from './logger';

export interface WebSocketHealthConfig {
  maxRetryAttempts: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  healthCheckInterval: number;
  connectionTimeout: number;
  heartbeatInterval: number;
}

export interface ConnectionHealth {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  lastHeartbeat: number;
  retryCount: number;
  lastError?: string;
  errorCode?: number;
}

export interface RetryStrategy {
  delay: number;
  jitter: number;
  maxDelay: number;
}

class WebSocketHealthMonitor {
  private static instance: WebSocketHealthMonitor;
  private config: WebSocketHealthConfig;
  private healthStatus: ConnectionHealth;
  private retryTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStartTime: number = 0;
  private isDestroyed: boolean = false;

  private constructor() {
    this.config = {
      maxRetryAttempts: 5,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 30000, // 30 seconds
      healthCheckInterval: 10000, // 10 seconds
      connectionTimeout: 15000, // 15 seconds
      heartbeatInterval: 30000, // 30 seconds
    };

    this.healthStatus = {
      status: 'disconnected',
      quality: 'poor',
      latency: 0,
      lastHeartbeat: 0,
      retryCount: 0
    };

    this.initializeHealthMonitoring();
  }

  public static getInstance(): WebSocketHealthMonitor {
    if (!WebSocketHealthMonitor.instance) {
      WebSocketHealthMonitor.instance = new WebSocketHealthMonitor();
    }
    return WebSocketHealthMonitor.instance;
  }

  private initializeHealthMonitoring(): void {
    // Start health check interval
    this.startHealthCheckInterval();
  }

  /**
   * Start health check interval
   */
  private startHealthCheckInterval(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform connection health check
   */
  private performHealthCheck(): void {
    const now = Date.now();
    
    // Check if connection is stale
    if (this.healthStatus.status === 'connected' && 
        now - this.healthStatus.lastHeartbeat > this.config.heartbeatInterval * 2) {
      logConnection.warn('Connection appears stale, initiating health check');
      this.handleConnectionIssue('Connection timeout', 1000);
    }

    // Update connection quality based on latency
    this.updateConnectionQuality();
  }

  /**
   * Update connection quality based on latency
   */
  private updateConnectionQuality(): void {
    if (this.healthStatus.latency < 50) {
      this.healthStatus.quality = 'excellent';
    } else if (this.healthStatus.latency < 100) {
      this.healthStatus.quality = 'good';
    } else if (this.healthStatus.latency < 200) {
      this.healthStatus.quality = 'fair';
    } else {
      this.healthStatus.quality = 'poor';
    }
  }

  /**
   * Handle connection issues with proper error categorization
   */
  public handleConnectionIssue(error: string, errorCode?: number): void {
    if (this.isDestroyed) return;

    logConnection.warn('Connection issue detected', { error, errorCode });

    // Categorize error and determine retry strategy
    if (errorCode === 1011) {
      // Server endpoint going away - implement aggressive reconnection
      this.handleServerEndpointIssue();
    } else if (errorCode === 1005) {
      // No status - connection issue
      this.handleConnectionFailure();
    } else if (errorCode === 1006) {
      // Abnormal closure
      this.handleAbnormalClosure();
    } else {
      // Generic error
      this.handleGenericError(error);
    }
  }

  /**
   * Handle code 1011 (server endpoint going away)
   */
  private handleServerEndpointIssue(): void {
    // Downgrade to debug level to reduce noise - code 1011 is common and handled automatically
    logConnection.debug('Handling server endpoint issue (code 1011) - automatic retry');
    
    this.healthStatus.status = 'reconnecting';
    this.healthStatus.lastError = 'Server endpoint going away';
    this.healthStatus.errorCode = 1011;

    // Implement aggressive reconnection for server endpoint issues
    const retryDelay = Math.min(this.config.baseRetryDelay * 2, this.config.maxRetryDelay);
    
    this.scheduleRetry(retryDelay, 'Server endpoint reconnection');
  }

  /**
   * Handle code 1005 (no status)
   */
  private handleConnectionFailure(): void {
    logConnection.info('Handling connection failure (code 1005)');
    
    this.healthStatus.status = 'reconnecting';
    this.healthStatus.lastError = 'Connection failed';
    this.healthStatus.errorCode = 1005;

    // Standard exponential backoff for connection failures
    this.implementExponentialBackoff();
  }

  /**
   * Handle code 1006 (abnormal closure)
   */
  private handleAbnormalClosure(): void {
    logConnection.info('Handling abnormal closure (code 1006)');
    
    this.healthStatus.status = 'reconnecting';
    this.healthStatus.lastError = 'Abnormal closure';
    this.healthStatus.errorCode = 1006;

    // Implement exponential backoff with jitter
    this.implementExponentialBackoffWithJitter();
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: string): void {
    logConnection.info('Handling generic connection error');
    
    this.healthStatus.status = 'reconnecting';
    this.healthStatus.lastError = error;

    // Standard exponential backoff
    this.implementExponentialBackoff();
  }

  /**
   * Implement exponential backoff retry strategy
   */
  private implementExponentialBackoff(): void {
    if (this.healthStatus.retryCount >= this.config.maxRetryAttempts) {
      logConnection.error('Max retry attempts reached', { retryCount: this.healthStatus.retryCount });
      this.healthStatus.status = 'error';
      return;
    }

    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, this.healthStatus.retryCount),
      this.config.maxRetryDelay
    );

    this.scheduleRetry(delay, 'Exponential backoff retry');
  }

  /**
   * Implement exponential backoff with jitter
   */
  private implementExponentialBackoffWithJitter(): void {
    if (this.healthStatus.retryCount >= this.config.maxRetryAttempts) {
      logConnection.error('Max retry attempts reached', { retryCount: this.healthStatus.retryCount });
      this.healthStatus.status = 'error';
      return;
    }

    const baseDelay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, this.healthStatus.retryCount),
      this.config.maxRetryDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000; // 0-1 second jitter
    const delay = baseDelay + jitter;

    this.scheduleRetry(delay, 'Exponential backoff with jitter retry');
  }

  /**
   * Schedule retry with specified delay
   */
  private scheduleRetry(delay: number, reason: string): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Use debug level for code 1011 retries to reduce noise
    if (this.healthStatus.errorCode === 1011) {
      logConnection.debug('Scheduling connection retry for code 1011', { delay, reason, retryCount: this.healthStatus.retryCount });
    } else {
      logConnection.info('Scheduling connection retry', { delay, reason, retryCount: this.healthStatus.retryCount });
    }

    this.retryTimeout = setTimeout(() => {
      if (this.isDestroyed) return;
      
      this.healthStatus.retryCount++;
      this.attemptReconnection();
    }, delay);
  }

  /**
   * Attempt reconnection
   */
  private attemptReconnection(): void {
    if (this.isDestroyed) return;

    logConnection.info('Attempting reconnection', { retryCount: this.healthStatus.retryCount });
    
    this.healthStatus.status = 'connecting';
    this.connectionStartTime = Date.now();

    // Emit reconnection event for components to handle
    this.emitReconnectionEvent();
  }

  /**
   * Emit reconnection event
   */
  private emitReconnectionEvent(): void {
    if (typeof window === 'undefined') return;

    const event = new CustomEvent('websocketReconnection', {
      detail: {
        retryCount: this.healthStatus.retryCount,
        errorCode: this.healthStatus.errorCode,
        lastError: this.healthStatus.lastError
      }
    });

    window.dispatchEvent(event);
  }

  /**
   * Handle successful connection
   */
  public handleConnectionSuccess(): void {
    if (this.isDestroyed) return;

    const connectionTime = Date.now() - this.connectionStartTime;
    
    logConnection.info('Connection successful', { 
      connectionTime, 
      retryCount: this.healthStatus.retryCount 
    });

    this.healthStatus.status = 'connected';
    this.healthStatus.retryCount = 0;
    this.healthStatus.lastError = undefined;
    this.healthStatus.errorCode = undefined;
    this.healthStatus.lastHeartbeat = Date.now();

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    // Emit connection success event
    this.emitConnectionSuccessEvent();
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isDestroyed || this.healthStatus.status !== 'connected') return;
      
      this.performHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Perform heartbeat check
   */
  private performHeartbeat(): void {
    const now = Date.now();
    this.healthStatus.lastHeartbeat = now;

    // Measure latency
    const startTime = performance.now();
    
    // Simulate heartbeat (in real implementation, this would be an actual ping)
    setTimeout(() => {
      if (this.isDestroyed) return;
      
      const latency = performance.now() - startTime;
      this.healthStatus.latency = Math.round(latency);
      
      this.updateConnectionQuality();
    }, 0);
  }

  /**
   * Emit connection success event
   */
  private emitConnectionSuccessEvent(): void {
    if (typeof window === 'undefined') return;

    const event = new CustomEvent('websocketConnected', {
      detail: {
        quality: this.healthStatus.quality,
        latency: this.healthStatus.latency
      }
    });

    window.dispatchEvent(event);
  }

  /**
   * Get current connection health status
   */
  public getConnectionHealth(): ConnectionHealth {
    return { ...this.healthStatus };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<WebSocketHealthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart intervals with new configuration
    this.startHealthCheckInterval();
    if (this.healthStatus.status === 'connected') {
      this.startHeartbeatMonitoring();
    }
  }

  /**
   * Reset connection health
   */
  public resetConnectionHealth(): void {
    this.healthStatus = {
      status: 'disconnected',
      quality: 'poor',
      latency: 0,
      lastHeartbeat: 0,
      retryCount: 0
    };

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.isDestroyed = true;

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Export singleton instance
export const websocketHealthMonitor = WebSocketHealthMonitor.getInstance();

// Convenience functions
export const getConnectionHealth = () => websocketHealthMonitor.getConnectionHealth();
export const handleConnectionIssue = (error: string, errorCode?: number) => 
  websocketHealthMonitor.handleConnectionIssue(error, errorCode);
export const handleConnectionSuccess = () => websocketHealthMonitor.handleConnectionSuccess();
export const updateWebSocketConfig = (config: Partial<WebSocketHealthConfig>) => 
  websocketHealthMonitor.updateConfig(config);

export default websocketHealthMonitor;
