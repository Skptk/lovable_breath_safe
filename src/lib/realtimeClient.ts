import { RealtimeChannel, RealtimeChannelSendResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Environment flag to disable realtime entirely
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED !== 'false';

// Singleton connection manager
class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager;
  private activeChannels: Map<string, { channel: RealtimeChannel; refs: number; callbacks: Set<(payload: any) => void> }> = new Map();
  private connectionStatus: 'connected' | 'reconnecting' | 'disconnected' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // Start with 2 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private statusListeners: Set<(status: 'connected' | 'reconnecting' | 'disconnected') => void> = new Set();

  private constructor() {
    this.setupGlobalConnectionHandlers();
  }

  public static getInstance(): RealtimeConnectionManager {
    if (!RealtimeConnectionManager.instance) {
      RealtimeConnectionManager.instance = new RealtimeConnectionManager();
    }
    return RealtimeConnectionManager.instance;
  }

  private setupGlobalConnectionHandlers(): void {
    // Listen to global connection events
    supabase.realtime.on('connected', () => {
      console.info('[Realtime] Connected ✅');
      this.setConnectionStatus('connected');
      this.resetReconnectAttempts();
    });

    supabase.realtime.on('disconnected', () => {
      console.warn('[Realtime] Disconnected ❌');
      this.setConnectionStatus('disconnected');
      this.scheduleReconnect();
    });

    supabase.realtime.on('reconnecting', () => {
      console.info('[Realtime] Reconnecting…');
      this.setConnectionStatus('reconnecting');
    });

    supabase.realtime.on('error', (error) => {
      console.error('[Realtime] Global error:', error);
      this.setConnectionStatus('disconnected');
      this.scheduleReconnect();
    });
  }

  private setConnectionStatus(status: 'connected' | 'reconnecting' | 'disconnected'): void {
    this.connectionStatus = status;
    this.notifyStatusListeners(status);
  }

  private notifyStatusListeners(status: 'connected' | 'reconnecting' | 'disconnected'): void {
    this.statusListeners.forEach(listener => listener(status));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
      
      console.info(`[Realtime] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnect();
      }, delay);
    } else {
      console.error('[Realtime] Max reconnect attempts reached. Manual intervention required.');
    }
  }

  private async attemptReconnect(): Promise<void> {
    try {
      console.info('[Realtime] Attempting to reconnect...');
      this.setConnectionStatus('reconnecting');
      
      // Force a reconnection by disconnecting and reconnecting
      await supabase.realtime.disconnect();
      await supabase.realtime.connect();
      
      // Reconnect all active channels
      await this.reconnectAllChannels();
      
    } catch (error) {
      console.error('[Realtime] Reconnect failed:', error);
      this.setConnectionStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private async reconnectAllChannels(): Promise<void> {
    const channelEntries = Array.from(this.activeChannels.entries());
    
    for (const [channelName, channelData] of channelEntries) {
      try {
        console.info(`[Realtime] Reconnecting channel: ${channelName}`);
        
        // Create new channel
        const newChannel = supabase.channel(channelName);
        
        // Reattach all callbacks
        channelData.callbacks.forEach(callback => {
          newChannel.on('*', callback);
        });
        
        // Subscribe to the new channel
        const subscription = await newChannel.subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            console.info(`[Realtime] Channel '${channelName}' reconnected successfully`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[Realtime] Channel '${channelName}' reconnection failed:`, status, error);
          }
        });
        
        // Update the channel reference
        this.activeChannels.set(channelName, {
          channel: subscription,
          refs: channelData.refs,
          callbacks: channelData.callbacks
        });
        
      } catch (error) {
        console.error(`[Realtime] Failed to reconnect channel '${channelName}':`, error);
      }
    }
  }

  private resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000;
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
        channel.on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema,
            table: config.table,
            filter: config.filter,
          },
          (payload) => {
            callback(payload);
          }
        );
      } else {
        // Generic channel for custom events
        channel.on('*', (event, payload) => {
          callback(payload);
        });
      }

      // Set up error handling for the channel
      channel.onError((error) => {
        console.warn(`[Realtime] Channel '${channelName}' error, retrying…`, error);
        this.handleChannelError(channelName);
      });

      // Subscribe to the channel
      const subscription = channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[Realtime] Successfully subscribed to '${channelName}'`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] Channel '${channelName}' subscription error:`, status, error);
          this.handleChannelError(channelName);
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

  private handleChannelError(channelName: string): void {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;

    // Wait 2-5 seconds before reconnecting
    const delay = Math.random() * 3000 + 2000;
    
    setTimeout(() => {
      console.info(`[Realtime] Attempting to reconnect channel '${channelName}' after error`);
      this.reconnectChannel(channelName);
    }, delay);
  }

  private async reconnectChannel(channelName: string): Promise<void> {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;

    try {
      // Remove the old channel
      await supabase.removeChannel(channelData.channel);
      
      // Create new channel with same configuration
      const newChannel = supabase.channel(channelName);
      
      // Reattach all callbacks
      channelData.callbacks.forEach(callback => {
        newChannel.on('*', callback);
      });

      // Subscribe to the new channel
      const subscription = await newChannel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[Realtime] Channel '${channelName}' reconnected successfully`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] Channel '${channelName}' reconnection failed:`, status, error);
        }
      });

      // Update the channel reference
      this.activeChannels.set(channelName, {
        channel: subscription,
        refs: channelData.refs,
        callbacks: channelData.callbacks
      });

    } catch (error) {
      console.error(`[Realtime] Failed to reconnect channel '${channelName}':`, error);
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

    // If no more references, remove the channel
    if (channelData.refs <= 0) {
      console.info(`[Realtime] Removing channel '${channelName}' (no more references)`);
      
      try {
        supabase.removeChannel(channelData.channel);
        this.activeChannels.delete(channelName);
        console.info(`[Realtime] Successfully removed channel '${channelName}'`);
      } catch (error) {
        console.error(`[Realtime] Error removing channel '${channelName}':`, error);
      }
    }
  }

  public cleanupAllChannels(): void {
    console.info(`[Realtime] Cleaning up ${this.activeChannels.size} active channels`);
    
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
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  public isChannelActive(channelName: string): boolean {
    return this.activeChannels.has(channelName);
  }

  public resetConnectionState(): void {
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000;
    console.info('[Realtime] Connection state reset');
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
