import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Environment flag to disable realtime entirely
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED !== 'false';

// Singleton connection manager
class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager;
  private activeChannels: Map<string, { channel: RealtimeChannel; refs: number; callbacks: Set<(payload: any) => void> }> = new Map();
  private connectionStatus: 'connected' | 'reconnecting' | 'disconnected' = 'connected';
  private statusListeners: Set<(status: 'connected' | 'reconnecting' | 'disconnected') => void> = new Set();
  private pendingCleanups: Map<string, NodeJS.Timeout> = new Map(); // Track pending cleanups

  private constructor() {
    // Start with connected status
    this.setConnectionStatus('connected');
  }

  public static getInstance(): RealtimeConnectionManager {
    if (!RealtimeConnectionManager.instance) {
      RealtimeConnectionManager.instance = new RealtimeConnectionManager();
    }
    return RealtimeConnectionManager.instance;
  }

  private setConnectionStatus(status: 'connected' | 'reconnecting' | 'disconnected'): void {
    if (this.connectionStatus !== status) {
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
    this.statusListeners.forEach(listener => listener(status));
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
    if (!REALTIME_ENABLED) {
      console.warn(`[Realtime] Realtime disabled. Channel '${channelName}' not created.`);
      return;
    }

    // Clear any pending cleanup for this channel
    if (this.pendingCleanups.has(channelName)) {
      clearTimeout(this.pendingCleanups.get(channelName)!);
      this.pendingCleanups.delete(channelName);
    }

    let channelData = this.activeChannels.get(channelName);

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
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] Channel '${channelName}' subscription error:`, status, error);
        }
      });

      // Store the channel with reference counting
      this.activeChannels.set(channelName, {
        channel: subscription,
        refs: 1,
        callbacks: new Set([callback])
      });
      
    } catch (error) {
      console.error(`[Realtime] Failed to create channel '${channelName}':`, error);
    }
  }

  public unsubscribeFromChannel(channelName: string, callback?: (payload: any) => void): void {
    const channelData = this.activeChannels.get(channelName);
    
    if (!channelData) {
      console.warn(`[Realtime] Channel '${channelName}' not found for unsubscription`);
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
        this.removeChannel(channelName);
      }, 1000); // 1 second delay
      
      this.pendingCleanups.set(channelName, cleanupTimeout);
    }
  }

  private removeChannel(channelName: string): void {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;

    console.info(`[Realtime] Removing channel '${channelName}'`);
    
    try {
      supabase.removeChannel(channelData.channel);
      this.activeChannels.delete(channelName);
      this.pendingCleanups.delete(channelName);
      console.info(`[Realtime] Successfully removed channel '${channelName}'`);
    } catch (error) {
      console.error(`[Realtime] Error removing channel '${channelName}':`, error);
    }
  }

  public cleanupAllChannels(): void {
    console.info(`[Realtime] Cleaning up ${this.activeChannels.size} active channels`);
    
    // Clear all pending cleanups
    for (const timeout of this.pendingCleanups.values()) {
      clearTimeout(timeout);
    }
    this.pendingCleanups.clear();
    
    for (const [channelName, channelData] of this.activeChannels.entries()) {
      try {
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
    return this.connectionStatus;
  }

  public addStatusListener(listener: (status: 'connected' | 'reconnecting' | 'disconnected') => void): () => void {
    this.statusListeners.add(listener);
    
    // Return cleanup function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getChannelStatus(): {
    enabled: boolean;
    activeChannels: string[];
    totalChannels: number;
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
    reconnectAttempts: number;
  } {
    return {
      enabled: REALTIME_ENABLED,
      activeChannels: Array.from(this.activeChannels.keys()),
      totalChannels: this.activeChannels.size,
      connectionStatus: this.connectionStatus,
      reconnectAttempts: 0, // Simplified for now
    };
  }

  public isChannelActive(channelName: string): boolean {
    return this.activeChannels.has(channelName);
  }

  public resetConnectionState(): void {
    console.info('[Realtime] Connection state reset');
  }

  public destroy(): void {
    // Clean up all channels
    this.cleanupAllChannels();
    
    // Clear status listeners
    this.statusListeners.clear();
  }
}

// Export singleton instance
const realtimeManager = RealtimeConnectionManager.getInstance();

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
  realtimeManager.subscribeToChannel(channelName, callback, config);
}

export function unsubscribeFromChannel(channelName: string, callback?: (payload: any) => void): void {
  realtimeManager.unsubscribeFromChannel(channelName, callback);
}

export function cleanupAllChannels(): void {
  realtimeManager.cleanupAllChannels();
}

export function getChannelStatus() {
  return realtimeManager.getChannelStatus();
}

export function isChannelActive(channelName: string): boolean {
  return realtimeManager.isChannelActive(channelName);
}

export function resetConnectionState(): void {
  realtimeManager.resetConnectionState();
}

export function getConnectionStatus(): 'connected' | 'reconnecting' | 'disconnected' {
  return realtimeManager.getConnectionStatus();
}

export function addConnectionStatusListener(listener: (status: 'connected' | 'reconnecting' | 'disconnected') => void): () => void {
  return realtimeManager.addStatusListener(listener);
}

// Export the manager instance for advanced usage
export { realtimeManager };
