import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Channel configuration interface
interface ChannelConfig {
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
  callback: (payload: any) => void;
}

// Channel state tracking
interface ChannelState {
  channel: RealtimeChannel;
  config: ChannelConfig;
  isActive: boolean;
  lastActivity: number;
  errorCount: number;
  lastError: number;
  isCircuitOpen: boolean;
  circuitOpenTime: number;
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  recoveryTimeout: number;       // Time to wait before attempting recovery
  monitorInterval: number;       // How often to check circuit state
}

/**
 * Centralized Channel Manager with Circuit Breaker Pattern
 * Reduces subscription churn and provides robust error handling
 */
export class ChannelManager {
  private static instance: ChannelManager;
  private channels: Map<string, ChannelState> = new Map();
  private subscriptionQueue: Array<{ channelName: string; config: ChannelConfig }> = [];
  private isProcessing: boolean = false;
  private circuitBreakerConfig: CircuitBreakerConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isDestroyed: boolean = false;

  private constructor() {
    this.circuitBreakerConfig = {
      failureThreshold: 3,        // Open circuit after 3 failures
      recoveryTimeout: 30000,     // Wait 30 seconds before recovery attempt
      monitorInterval: 10000      // Check circuit state every 10 seconds
    };

    this.startHealthMonitoring();
  }

  public static getInstance(): ChannelManager {
    if (!ChannelManager.instance) {
      ChannelManager.instance = new ChannelManager();
    }
    return ChannelManager.instance;
  }

  /**
   * Subscribe to a channel with batching and circuit breaker protection
   */
  public async subscribe(
    channelName: string, 
    config: ChannelConfig
  ): Promise<RealtimeChannel | null> {
    if (this.isDestroyed) {
      console.warn(`[ChannelManager] Manager destroyed, cannot subscribe to ${channelName}`);
      return null;
    }

    // Check if channel already exists and is healthy
    const existingChannel = this.channels.get(channelName);
    if (existingChannel && existingChannel.isActive && !existingChannel.isCircuitOpen) {
      console.log(`[ChannelManager] Channel ${channelName} already exists and healthy, reusing...`);
      
      // Update callback if different
      if (existingChannel.config.callback !== config.callback) {
        existingChannel.config.callback = config.callback;
        console.log(`[ChannelManager] Updated callback for ${channelName}`);
      }
      
      return existingChannel.channel;
    }

    // Check circuit breaker status
    if (existingChannel?.isCircuitOpen) {
      const timeSinceCircuitOpen = Date.now() - existingChannel.circuitOpenTime;
      if (timeSinceCircuitOpen < this.circuitBreakerConfig.recoveryTimeout) {
        console.warn(`[ChannelManager] Circuit breaker open for ${channelName}, waiting for recovery...`);
        return null;
      } else {
        console.log(`[ChannelManager] Attempting circuit recovery for ${channelName}`);
        existingChannel.isCircuitOpen = false;
        existingChannel.errorCount = 0;
      }
    }

    // Add to subscription queue for batching
    this.subscriptionQueue.push({ channelName, config });
    
    if (!this.isProcessing) {
      this.processQueue();
    }

    // Return existing channel if available, otherwise null
    return existingChannel?.channel || null;
  }

  /**
   * Process subscription queue with batching and rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.subscriptionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[ChannelManager] Processing ${this.subscriptionQueue.length} channel subscriptions`);

    while (this.subscriptionQueue.length > 0) {
      const { channelName, config } = this.subscriptionQueue.shift()!;
      
      try {
        const channel = await this.createChannel(channelName, config);
        if (channel) {
          this.channels.set(channelName, {
            channel,
            config,
            isActive: true,
            lastActivity: Date.now(),
            errorCount: 0,
            lastError: 0,
            isCircuitOpen: false,
            circuitOpenTime: 0
          });
          console.log(`[ChannelManager] Successfully created channel ${channelName}`);
        }
        
        // Add small delay to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[ChannelManager] Failed to create channel ${channelName}:`, error);
        this.handleChannelError(channelName, error);
      }
    }

    this.isProcessing = false;
    console.log(`[ChannelManager] Queue processing completed`);
  }

  /**
   * Create a new channel with proper error handling
   */
  private async createChannel(
    channelName: string, 
    config: ChannelConfig
  ): Promise<RealtimeChannel | null> {
    try {
      console.log(`[ChannelManager] Creating channel ${channelName}`);
      
      const channel = supabase.channel(channelName);
      
      // Configure postgres changes if config provided
      if (config.event && config.schema && config.table) {
        (channel as any).on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema,
            table: config.table,
            filter: config.filter,
          },
          (payload: any) => {
            this.updateChannelActivity(channelName);
            config.callback(payload);
          }
        );
      } else {
        // Generic channel for custom events
        (channel as any).on('*', (event: any, payload: any) => {
          this.updateChannelActivity(channelName);
          config.callback(payload);
        });
      }

      // Subscribe to the channel
      const subscription = channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[ChannelManager] Successfully subscribed to ${channelName}`);
          this.updateChannelActivity(channelName);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[ChannelManager] Channel ${channelName} subscription error:`, {
            status,
            error: error?.message || error,
            channelName,
            timestamp: new Date().toISOString()
          });
          this.handleChannelError(channelName, error);
        } else if (status === 'CLOSED') {
          console.info(`[ChannelManager] Channel ${channelName} closed`);
          this.markChannelInactive(channelName);
        }
      });

      return subscription;
      
    } catch (error) {
      console.error(`[ChannelManager] Error creating channel ${channelName}:`, error);
      this.handleChannelError(channelName, error);
      return null;
    }
  }

  /**
   * Handle channel errors with circuit breaker pattern
   */
  private handleChannelError(channelName: string, error: any): void {
    const channelState = this.channels.get(channelName);
    if (!channelState) return;

    const now = Date.now();
    channelState.lastError = now;
    channelState.errorCount++;

    console.error(`[ChannelManager] Channel ${channelName} error (${channelState.errorCount}/${this.circuitBreakerConfig.failureThreshold}):`, {
      error: error?.message || error,
      channelName,
      timestamp: new Date().toISOString(),
      errorCount: channelState.errorCount
    });

    // Check if circuit should be opened
    if (channelState.errorCount >= this.circuitBreakerConfig.failureThreshold) {
      channelState.isCircuitOpen = true;
      channelState.circuitOpenTime = now;
      channelState.isActive = false;
      
      console.warn(`[ChannelManager] Circuit breaker opened for ${channelName} due to ${channelState.errorCount} consecutive failures`);
      
      // Attempt to close circuit after recovery timeout
      setTimeout(() => {
        if (this.channels.has(channelName)) {
          const state = this.channels.get(channelName)!;
          if (state.isCircuitOpen) {
            console.log(`[ChannelManager] Attempting to close circuit for ${channelName}`);
            state.isCircuitOpen = false;
            state.errorCount = 0;
          }
        }
      }, this.circuitBreakerConfig.recoveryTimeout);
    }
  }

  /**
   * Update channel activity timestamp
   */
  private updateChannelActivity(channelName: string): void {
    const channelState = this.channels.get(channelName);
    if (channelState) {
      channelState.lastActivity = Date.now();
      channelState.isActive = true;
    }
  }

  /**
   * Mark channel as inactive
   */
  private markChannelInactive(channelName: string): void {
    const channelState = this.channels.get(channelName);
    if (channelState) {
      channelState.isActive = false;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  public unsubscribe(channelName: string): void {
    if (this.isDestroyed) return;

    const channelState = this.channels.get(channelName);
    if (!channelState) return;

    try {
      console.log(`[ChannelManager] Unsubscribing from ${channelName}`);
      
      if (channelState.channel && typeof channelState.channel.unsubscribe === 'function') {
        channelState.channel.unsubscribe();
      }
      
      supabase.removeChannel(channelState.channel);
      this.channels.delete(channelName);
      
      console.log(`[ChannelManager] Successfully unsubscribed from ${channelName}`);
      
    } catch (error) {
      console.error(`[ChannelManager] Error unsubscribing from ${channelName}:`, error);
      // Force remove from tracking even if Supabase removal fails
      this.channels.delete(channelName);
    }
  }

  /**
   * Get channel status information
   */
  public getChannelStatus(channelName: string): {
    exists: boolean;
    isActive: boolean;
    isCircuitOpen: boolean;
    errorCount: number;
    lastActivity: number;
    lastError: number;
  } | null {
    const channelState = this.channels.get(channelName);
    if (!channelState) return null;

    return {
      exists: true,
      isActive: channelState.isActive,
      isCircuitOpen: channelState.isCircuitOpen,
      errorCount: channelState.errorCount,
      lastActivity: channelState.lastActivity,
      lastError: channelState.lastError
    };
  }

  /**
   * Get overall manager status
   */
  public getStatus(): {
    totalChannels: number;
    activeChannels: number;
    openCircuits: number;
    queueLength: number;
    isProcessing: boolean;
  } {
    let activeChannels = 0;
    let openCircuits = 0;

    for (const channelState of this.channels.values()) {
      if (channelState.isActive) activeChannels++;
      if (channelState.isCircuitOpen) openCircuits++;
    }

    return {
      totalChannels: this.channels.size,
      activeChannels,
      openCircuits,
      queueLength: this.subscriptionQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      if (this.isDestroyed) return;

      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [channelName, channelState] of this.channels.entries()) {
        // Check for stale channels
        if (now - channelState.lastActivity > staleThreshold && channelState.isActive) {
          console.warn(`[ChannelManager] Channel ${channelName} appears stale, checking health...`);
          this.checkChannelHealth(channelName);
        }
      }
    }, this.circuitBreakerConfig.monitorInterval);
  }

  /**
   * Check individual channel health
   */
  private checkChannelHealth(channelName: string): void {
    const channelState = this.channels.get(channelName);
    if (!channelState) return;

    try {
      // Try to access a property to check if the channel is still valid
      if (channelState.channel && typeof channelState.channel.subscribe === 'function') {
        // Channel appears healthy
        channelState.lastActivity = Date.now();
      } else {
        console.warn(`[ChannelManager] Channel ${channelName} appears unhealthy, will retry on next error`);
        channelState.isActive = false;
      }
    } catch (error) {
      console.warn(`[ChannelManager] Channel ${channelName} health check failed:`, error);
      channelState.isActive = false;
    }
  }

  /**
   * Cleanup all channels
   */
  public cleanupAllChannels(): void {
    if (this.isDestroyed) return;

    console.log(`[ChannelManager] Cleaning up ${this.channels.size} channels`);
    
    for (const [channelName, channelState] of this.channels.entries()) {
      try {
        if (channelState.channel && typeof channelState.channel.unsubscribe === 'function') {
          channelState.channel.unsubscribe();
        }
        supabase.removeChannel(channelState.channel);
        console.log(`[ChannelManager] Removed channel ${channelName}`);
      } catch (error) {
        console.error(`[ChannelManager] Error cleaning up channel ${channelName}:`, error);
      }
    }
    
    this.channels.clear();
    this.subscriptionQueue = [];
    this.isProcessing = false;
    
    console.log('[ChannelManager] All channels cleaned up');
  }

  /**
   * Destroy the manager
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    console.log('[ChannelManager] Destroying channel manager');
    this.isDestroyed = true;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.cleanupAllChannels();
    
    // Reset instance to allow recreation if needed
    ChannelManager.instance = null as any;
  }

  /**
   * Reset the manager state
   */
  public reset(): void {
    if (this.isDestroyed) return;

    console.log('[ChannelManager] Resetting channel manager');
    this.cleanupAllChannels();
  }
}

// Export singleton instance
let channelManager: ChannelManager | null = null;

export function getChannelManager(): ChannelManager {
  if (!channelManager) {
    channelManager = ChannelManager.getInstance();
  }
  return channelManager;
}

// Export convenience functions
export function subscribeToChannel(
  channelName: string, 
  config: ChannelConfig
): Promise<RealtimeChannel | null> {
  return getChannelManager().subscribe(channelName, config);
}

export function unsubscribeFromChannel(channelName: string): void {
  getChannelManager().unsubscribe(channelName);
}

export function getChannelStatus(channelName: string) {
  return getChannelManager().getChannelStatus(channelName);
}

export function getManagerStatus() {
  return getChannelManager().getStatus();
}

export function cleanupAllChannels(): void {
  getChannelManager().cleanupAllChannels();
}

export function destroyChannelManager(): void {
  if (channelManager) {
    channelManager.destroy();
    channelManager = null;
  }
}

export function resetChannelManager(): void {
  if (channelManager) {
    channelManager.reset();
  }
}
