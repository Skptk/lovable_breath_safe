import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Environment flag to disable realtime entirely
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED !== 'false';

// Retry configuration
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds

// Singleton connection manager
class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager;
  private activeChannels: Map<string, { 
    channel: RealtimeChannel; 
    refs: number; 
    callbacks: Set<(payload: any) => void>;
    retryCount: number;
    lastRetryTime: number;
    isReconnecting: boolean;
  }> = new Map();
  private connectionStatus: 'connected' | 'reconnecting' | 'disconnected' = 'connected';
  private statusListeners: Set<(status: 'connected' | 'reconnecting' | 'disconnected') => void> = new Set();
  private pendingCleanups: Map<string, NodeJS.Timeout> = new Map(); // Track pending cleanups
  private isDestroyed: boolean = false; // Track if manager is destroyed
  private navigationState: { currentView: string; lastViewChange: number } = { currentView: 'dashboard', lastViewChange: Date.now() }; // Track navigation state

  private constructor() {
    // Start with connected status
    this.setConnectionStatus('connected');
    
    // Listen for view changes to prevent duplicate subscriptions during navigation
    if (typeof window !== 'undefined') {
      window.addEventListener('viewChange', (event: any) => {
        const newView = event.detail?.view;
        if (newView && newView !== this.navigationState.currentView) {
          this.navigationState.currentView = newView;
          this.navigationState.lastViewChange = Date.now();
          console.log(`[Realtime] View changed to: ${newView}, preventing duplicate subscriptions for 2 seconds`);
        }
      });
    }
  }

  public static getInstance(): RealtimeConnectionManager {
    if (!RealtimeConnectionManager.instance) {
      RealtimeConnectionManager.instance = new RealtimeConnectionManager();
    }
    return RealtimeConnectionManager.instance;
  }

  private setConnectionStatus(status: 'connected' | 'reconnecting' | 'disconnected'): void {
    if (this.connectionStatus !== status && !this.isDestroyed) {
      this.connectionStatus = status;
      this.notifyStatusListeners(status);
      
      // Log status changes
      switch (status) {
        case 'connected':
          console.info('[Realtime] Connected ✅');
          break;
        case 'reconnecting':
          console.info('[Realtime] Reconnecting…');
          break;
        case 'disconnected':
          console.warn('[Realtime] Disconnected ❌');
          break;
      }
    }
  }

  private notifyStatusListeners(status: 'connected' | 'reconnecting' | 'disconnected'): void {
    if (!this.isDestroyed) {
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  // Calculate exponential backoff delay
  private calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  // Retry channel subscription with exponential backoff
  private async retryChannelSubscription(
    channelName: string,
    callback: (payload: any) => void,
    config?: {
      event?: string;
      schema?: string;
      table?: string;
      filter?: string;
    }
  ): Promise<void> {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;

    if (channelData.retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error(`[Realtime] Channel '${channelName}' failed after ${MAX_RETRY_ATTEMPTS} retry attempts. Giving up.`);
      this.setConnectionStatus('disconnected');
      return;
    }

    const now = Date.now();
    const timeSinceLastRetry = now - channelData.lastRetryTime;
    const retryDelay = this.calculateRetryDelay(channelData.retryCount);

    if (timeSinceLastRetry < retryDelay) {
      // Wait for the retry delay
      setTimeout(() => this.retryChannelSubscription(channelName, callback, config), retryDelay - timeSinceLastRetry);
      return;
    }

    console.log(`[Realtime] Retrying channel '${channelName}' subscription (attempt ${channelData.retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
    
    try {
      // Remove the old channel
      if (channelData.channel && typeof channelData.channel.unsubscribe === 'function') {
        channelData.channel.unsubscribe();
      }
      supabase.removeChannel(channelData.channel);

      // Create new channel
      const newChannel = supabase.channel(channelName);
      
      // Configure postgres changes if config provided
      if (config?.event && config?.schema && config?.table) {
        (newChannel as any).on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema,
            table: config.table,
            filter: config.filter,
          },
          (payload: any) => {
            callback(payload);
          }
        );
      } else {
        // Generic channel for custom events
        (newChannel as any).on('*', (event: any, payload: any) => {
          callback(payload);
        });
      }

      // Subscribe to the channel
      const subscription = newChannel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[Realtime] Successfully resubscribed to '${channelName}' after retry`);
          this.setConnectionStatus('connected');
          // Reset retry count on successful subscription
          channelData.retryCount = 0;
          channelData.isReconnecting = false;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] Channel '${channelName}' resubscription error:`, status, error);
          this.handleChannelError(channelName, error);
        } else if (status === 'CLOSED') {
          console.info(`[Realtime] Channel '${channelName}' closed after retry`);
        }
      });

      // Update channel data
      channelData.channel = subscription;
      channelData.retryCount++;
      channelData.lastRetryTime = now;
      channelData.isReconnecting = false;

    } catch (error) {
      console.error(`[Realtime] Failed to retry channel '${channelName}' subscription:`, error);
      this.handleChannelError(channelName, error);
    }
  }

  // Handle channel errors with retry logic
  private handleChannelError(channelName: string, error: any): void {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;

    // Log detailed error information
    console.error(`[Realtime] Channel '${channelName}' error:`, {
      channelName,
      error: error?.message || error,
      retryCount: channelData.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connectionStatus: this.connectionStatus
    });

    // Set reconnecting status
    channelData.isReconnecting = true;
    this.setConnectionStatus('reconnecting');

    // Attempt retry if not already reconnecting
    if (!channelData.isReconnecting) {
      this.retryChannelSubscription(channelName, Array.from(channelData.callbacks)[0], {
        event: 'postgres_changes',
        schema: 'public',
        table: channelName.includes('notifications') ? 'notifications' : 
               channelName.includes('points') ? 'user_points' : 
               channelName.includes('profile') ? 'profiles' : 'unknown'
      });
    }
  }

  public subscribeToChannel(
    channelName: string,
    callback: (payload: any) => void,
    config?: {
      event?: string;
      schema?: string;
      table?: string;
      filter?: string;
    }
  ): void {
    if (!REALTIME_ENABLED || this.isDestroyed) {
      console.warn(`[Realtime] Realtime disabled or manager destroyed. Channel '${channelName}' not created.`);
      return;
    }

    // Prevent duplicate subscriptions during rapid navigation changes
    const timeSinceLastViewChange = Date.now() - this.navigationState.lastViewChange;
    if (timeSinceLastViewChange < 2000) { // 2 second cooldown after view change
      console.log(`[Realtime] Skipping channel '${channelName}' subscription - too soon after view change (${timeSinceLastViewChange}ms ago)`);
      return;
    }

    // Clear any pending cleanup for this channel
    if (this.pendingCleanups.has(channelName)) {
      clearTimeout(this.pendingCleanups.get(channelName)!);
      this.pendingCleanups.delete(channelName);
    }

    const channelData = this.activeChannels.get(channelName);

    if (channelData) {
      // Channel exists, just add callback and increment refs
      channelData.callbacks.add(callback);
      channelData.refs++;
      console.info(`[Realtime] Channel '${channelName}' reused, refs: ${channelData.refs}`);
      return;
    }

    // Create new channel
    try {
      console.info(`[Realtime] Channel '${channelName}' subscribed`);
      
      const channel = supabase.channel(channelName);
      
      // Configure postgres changes if config provided
      if (config?.event && config?.schema && config?.table) {
        // Use type assertion to bypass TypeScript strict checking
        (channel as any).on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema,
            table: config.table,
            filter: config.filter,
          },
          (payload: any) => {
            callback(payload);
          }
        );
      } else {
        // Generic channel for custom events
        (channel as any).on('*', (event: any, payload: any) => {
          callback(payload);
        });
      }

      // Subscribe to the channel
      const subscription = channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[Realtime] Successfully subscribed to '${channelName}'`);
          this.setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Realtime] Channel '${channelName}' subscription error:`, {
            status,
            error: error?.message || error,
            channelName,
            timestamp: new Date().toISOString(),
            retryCount: 0
          });
          this.handleChannelError(channelName, error);
        } else if (status === 'CLOSED') {
          console.info(`[Realtime] Channel '${channelName}' closed`);
        }
      });

      // Store the channel with reference counting and retry tracking
      this.activeChannels.set(channelName, {
        channel: subscription,
        refs: 1,
        callbacks: new Set([callback]),
        retryCount: 0,
        lastRetryTime: 0,
        isReconnecting: false
      });
      
    } catch (error) {
      console.error(`[Realtime] Failed to create channel '${channelName}':`, {
        error: error?.message || error,
        channelName,
        timestamp: new Date().toISOString(),
        config
      });
      this.handleChannelError(channelName, error);
    }
  }

  public unsubscribeFromChannel(channelName: string, callback?: (payload: any) => void): void {
    if (this.isDestroyed) {
      return;
    }

    const channelData = this.activeChannels.get(channelName);
    
    if (!channelData) {
      // Channel not found - this is normal during cleanup, don't warn
      return;
    }

    if (callback) {
      // Remove specific callback
      channelData.callbacks.delete(callback);
    }

    // Decrement reference count
    channelData.refs--;
    console.info(`[Realtime] Channel '${channelName}' refs: ${channelData.refs}`);

    // If no more references, schedule removal with a delay to prevent immediate cleanup
    if (channelData.refs <= 0) {
      console.info(`[Realtime] Scheduling removal of channel '${channelName}' (no more references)`);
      
      // Schedule cleanup with a delay to prevent immediate removal
      const cleanupTimeout = setTimeout(() => {
        if (!this.isDestroyed) {
          this.removeChannel(channelName);
        }
      }, 1000); // 1 second delay
      
      this.pendingCleanups.set(channelName, cleanupTimeout);
    }
  }

  private removeChannel(channelName: string): void {
    if (this.isDestroyed) {
      return;
    }

    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;

    console.info(`[Realtime] Removing channel '${channelName}'`);
    
    try {
      // Check if channel is still active before removing
      if (channelData.channel && typeof channelData.channel.unsubscribe === 'function') {
        channelData.channel.unsubscribe();
      }
      supabase.removeChannel(channelData.channel);
      this.activeChannels.delete(channelName);
      this.pendingCleanups.delete(channelName);
      console.info(`[Realtime] Successfully removed channel '${channelName}'`);
    } catch (error) {
      console.error(`[Realtime] Error removing channel '${channelName}':`, error);
      // Force remove from our tracking even if Supabase removal fails
      this.activeChannels.delete(channelName);
      this.pendingCleanups.delete(channelName);
    }
  }

  public cleanupAllChannels(): void {
    if (this.isDestroyed) {
      return;
    }

    console.info(`[Realtime] Cleaning up ${this.activeChannels.size} active channels`);
    
    // Clear all pending cleanups
    for (const timeout of this.pendingCleanups.values()) {
      clearTimeout(timeout);
    }
    this.pendingCleanups.clear();
    
    for (const [channelName, channelData] of this.activeChannels.entries()) {
      try {
        // Check if channel is still active before removing
        if (channelData.channel && typeof channelData.channel.unsubscribe === 'function') {
          channelData.channel.unsubscribe();
        }
        supabase.removeChannel(channelData.channel);
        console.info(`[Realtime] Removed channel '${channelName}'`);
      } catch (error) {
        console.error(`[Realtime] Error cleaning up channel '${channelName}':`, error);
      }
    }
    
    this.activeChannels.clear();
    console.info('[Realtime] All channels cleaned up');
  }

  public getConnectionStatus(): 'connected' | 'reconnecting' | 'disconnected' {
    return this.isDestroyed ? 'disconnected' : this.connectionStatus;
  }

  public addStatusListener(listener: (status: 'connected' | 'reconnecting' | 'disconnected') => void): () => void {
    if (this.isDestroyed) {
      return () => {}; // Return no-op cleanup function if destroyed
    }

    this.statusListeners.add(listener);
    
    // Return cleanup function
    return () => {
      if (!this.isDestroyed) {
        this.statusListeners.delete(listener);
      }
    };
  }

  public getChannelStatus(): {
    enabled: boolean;
    activeChannels: string[];
    totalChannels: number;
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
    reconnectAttempts: number;
  } {
    let totalReconnectAttempts = 0;
    for (const channelData of this.activeChannels.values()) {
      totalReconnectAttempts += channelData.retryCount;
    }

    return {
      enabled: REALTIME_ENABLED && !this.isDestroyed,
      activeChannels: Array.from(this.activeChannels.keys()),
      totalChannels: this.activeChannels.size,
      connectionStatus: this.getConnectionStatus(),
      reconnectAttempts: totalReconnectAttempts,
    };
  }

  public isChannelActive(channelName: string): boolean {
    return !this.isDestroyed && this.activeChannels.has(channelName);
  }

  public resetConnectionState(): void {
    if (!this.isDestroyed) {
      console.info('[Realtime] Connection state reset');
      this.setConnectionStatus('connected');
    }
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    console.info('[Realtime] Destroying realtime manager');
    this.isDestroyed = true;
    
    // Clean up all channels
    this.cleanupAllChannels();
    
    // Clear status listeners
    this.statusListeners.clear();
    
    // Reset instance to allow recreation if needed
    RealtimeConnectionManager.instance = null as any;
  }

  public reset(): void {
    if (this.isDestroyed) {
      return;
    }

    console.info('[Realtime] Resetting realtime manager');
    this.cleanupAllChannels();
    this.setConnectionStatus('connected');
  }
}

// Export singleton instance
let realtimeManager: RealtimeConnectionManager | null = null;

function getRealtimeManager(): RealtimeConnectionManager {
  if (!realtimeManager) {
    realtimeManager = RealtimeConnectionManager.getInstance();
  }
  return realtimeManager;
}

// Export convenience functions that use the singleton
export function subscribeToChannel(
  channelName: string,
  callback: (payload: any) => void,
  config?: {
    event?: string;
    schema?: string;
    table?: string;
    filter?: string;
  }
): void {
  getRealtimeManager().subscribeToChannel(channelName, callback, config);
}

export function unsubscribeFromChannel(channelName: string, callback?: (payload: any) => void): void {
  getRealtimeManager().unsubscribeFromChannel(channelName, callback);
}

export function cleanupAllChannels(): void {
  getRealtimeManager().cleanupAllChannels();
}

export function getChannelStatus() {
  return getRealtimeManager().getChannelStatus();
}

export function isChannelActive(channelName: string): boolean {
  return getRealtimeManager().isChannelActive(channelName);
}

export function resetConnectionState(): void {
  getRealtimeManager().resetConnectionState();
}

export function getConnectionStatus(): 'connected' | 'reconnecting' | 'disconnected' {
  return getRealtimeManager().getConnectionStatus();
}

export function addConnectionStatusListener(listener: (status: 'connected' | 'reconnecting' | 'disconnected') => void): () => void {
  return getRealtimeManager().addStatusListener(listener);
}

export function destroyRealtimeManager(): void {
  if (realtimeManager) {
    realtimeManager.destroy();
    realtimeManager = null;
  }
}

export function resetRealtimeManager(): void {
  if (realtimeManager) {
    realtimeManager.reset();
  }
}

// Export the manager instance for advanced usage
export { getRealtimeManager as realtimeManager };
