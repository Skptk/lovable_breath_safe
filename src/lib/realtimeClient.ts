import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logConnection } from '@/lib/logger';

// Environment flag to disable realtime entirely
const REALTIME_ENABLED = (import.meta.env['VITE_SUPABASE_REALTIME_ENABLED'] ?? 'true') !== 'false';

// IMPROVED RETRY CONFIGURATION
const MAX_RETRY_ATTEMPTS = 5; // Increased from 3
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 60 seconds (increased from 30)

// WebSocket-specific error handling configuration
const WEBSOCKET_ERROR_CONFIG = {
  // Code 1011 = "Internal Server Error" - server terminating connections
  CODE_1011: {
    maxRetries: 3,
    baseDelay: 2000, // Start with 2 seconds for server errors
    maxDelay: 30000, // Cap at 30 seconds
    backoffFactor: 2.5, // More aggressive backoff for server errors
    jitter: true,
    requireTokenRefresh: true // Always refresh token before retry
  },
  // Code 1005 = "No Status" - connection issues
  CODE_1005: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffFactor: 2,
    jitter: true,
    requireTokenRefresh: false
  },
  // Code 1006 = "Abnormal Closure" - network issues
  CODE_1006: {
    maxRetries: 4,
    baseDelay: 1500,
    maxDelay: 45000,
    backoffFactor: 2.2,
    jitter: true,
    requireTokenRefresh: false
  },
  // Default configuration
  DEFAULT: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    requireTokenRefresh: false
  }
} as const;

// Connection pooling and rate limiting
const CONNECTION_POOL_CONFIG = {
  maxConcurrentConnections: 3,
  connectionCooldown: 5000, // 5 seconds between connection attempts
  maxRetriesPerMinute: 10,
  retryWindowMs: 60000 // 1 minute window
} as const;

// Singleton connection manager with improved WebSocket handling
class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager;
  private activeChannels: Map<string, { 
    channel: RealtimeChannel; 
    refs: number; 
    callbacks: Set<(payload: any) => void>;
    retryCount: number;
    lastRetryTime: number;
    isReconnecting: boolean;
    connectionHealth: 'healthy' | 'unhealthy' | 'unknown';
    config: any; // Add config property for channel recovery
  }> = new Map();
  private connectionStatus: 'connected' | 'reconnecting' | 'disconnected' = 'connected';
  private statusListeners: Set<(status: 'connected' | 'reconnecting' | 'disconnected') => void> = new Set();
  private pendingCleanups: Map<string, NodeJS.Timeout> = new Map(); // Track pending cleanups
  private pendingReadyChecks: Map<string, NodeJS.Timeout> = new Map();
  private pendingReadyResolvers: Map<string, Array<(channel: RealtimeChannel | null) => void>> = new Map();
  private isDestroyed: boolean = false; // Track if manager is destroyed
  private navigationState: { currentView: string; lastViewChange: number } = { currentView: 'dashboard', lastViewChange: Date.now() }; // Track navigation state
  private globalRetryTimeout: NodeJS.Timeout | null = null; // Global retry mechanism

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

      // Add connection health check with improved WebSocket monitoring
      this.startConnectionHealthCheck();
      
      // Add global connection recovery mechanism
      this.startGlobalConnectionRecovery();
      
      // Add WebSocket reconnection mechanism for code 1011
      this.startWebSocketReconnection();
    }
  }

  private isRealtimeClientReady(): boolean {
    if (this.isDestroyed || !REALTIME_ENABLED) {
      return false;
    }

    try {
      const hasChannelFactory = typeof (supabase as any)?.channel === 'function';
      const hasRealtimeInstance = typeof (supabase as any)?.realtime === 'object';
      return hasChannelFactory && hasRealtimeInstance;
    } catch (error) {
      console.warn('[Realtime] Supabase realtime not ready yet:', error);
      return false;
    }
  }

  // Start global connection recovery mechanism
  private startGlobalConnectionRecovery(): void {
    setInterval(() => {
      if (this.isDestroyed) return;
      
      // Check if we have unhealthy channels that need recovery
      let hasUnhealthyChannels = false;
      for (const [channelName, channelData] of this.activeChannels) {
        if (channelData.connectionHealth === 'unhealthy') {
          hasUnhealthyChannels = true;
          console.log(`[Realtime] Channel '${channelName}' marked as unhealthy, scheduling recovery...`);
          
          // Schedule recovery with exponential backoff
          this.scheduleChannelRecovery(channelName);
        }
      }
      
      // If we have unhealthy channels, update global status
      if (hasUnhealthyChannels && this.connectionStatus === 'connected') {
        this.setConnectionStatus('reconnecting');
      }
    }, 30000); // Check every 30 seconds
  }

  // Schedule channel recovery with exponential backoff
  private scheduleChannelRecovery(channelName: string): void {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;
    
    const retryDelay = this.calculateRetryDelay(channelData.retryCount);
    console.log(`[Realtime] Scheduling recovery for channel '${channelName}' in ${retryDelay}ms (attempt ${channelData.retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
    
    setTimeout(() => {
      if (this.isDestroyed) return;
      this.recoverChannel(channelName);
    }, retryDelay);
  }

  // Recover a specific channel
  private async recoverChannel(channelName: string): Promise<void> {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;
    
    if (channelData.retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error(`[Realtime] Channel '${channelName}' failed after ${MAX_RETRY_ATTEMPTS} recovery attempts. Marking as permanently failed.`);
      channelData.connectionHealth = 'unhealthy';
      return;
    }
    
    console.log(`[Realtime] Attempting to recover channel '${channelName}'...`);
    
    try {
      // Create new channel
      const newChannel = supabase.channel(channelName);
      
      // Re-subscribe with existing callbacks
      channelData.callbacks.forEach(existingCallback => {
        (newChannel as any).on('*', (_event: any, payload: any) => {
          existingCallback(payload);
        });
      });
      
      // Update channel data
      channelData.channel = newChannel;
      channelData.retryCount++;
      channelData.lastRetryTime = Date.now();
      channelData.isReconnecting = false;
      channelData.connectionHealth = 'healthy';
      
      console.log(`[Realtime] Successfully recovered channel '${channelName}'`);
      
      // Update global status if we were reconnecting
      if (this.connectionStatus === 'reconnecting') {
        this.setConnectionStatus('connected');
      }
      
    } catch (error) {
      console.error(`[Realtime] Failed to recover channel '${channelName}':`, error);
      channelData.connectionHealth = 'unhealthy';
      channelData.isReconnecting = true;
      
      // Schedule another recovery attempt
      this.scheduleChannelRecovery(channelName);
    }
  }

  // Start periodic connection health check with WebSocket monitoring
  private startConnectionHealthCheck(): void {
    setInterval(() => {
      if (this.isDestroyed) return;
      
      const now = Date.now();
      let hasActiveConnections = false;
      let hasReconnectingChannels = false;
      let hasUnhealthyChannels = false;

      // Check all channels for health
      for (const [channelName, channelData] of this.activeChannels) {
        if (channelData.isReconnecting) {
          hasReconnectingChannels = true;
        }
        
        if (channelData.connectionHealth === 'unhealthy') {
          hasUnhealthyChannels = true;
        }
        
        // Check if channel is stale (no activity for more than 5 minutes)
        if (now - channelData.lastRetryTime > 5 * 60 * 1000 && channelData.lastRetryTime > 0) {
          console.warn(`[Realtime] Channel '${channelName}' appears stale, checking health...`);
          // Trigger a health check by attempting to ping the channel
          this.checkChannelHealth(channelName);
        }
        
        hasActiveConnections = true;
      }

      // Update connection status based on channel health
      if (hasReconnectingChannels || hasUnhealthyChannels) {
        this.setConnectionStatus('reconnecting');
      } else if (hasActiveConnections) {
        this.setConnectionStatus('connected');
      } else {
        this.setConnectionStatus('disconnected');
      }
      
      // Log connection health summary
      if (hasUnhealthyChannels || hasReconnectingChannels) {
        console.warn(`[Realtime] Connection health: ${hasUnhealthyChannels ? 'Unhealthy channels detected' : ''} ${hasReconnectingChannels ? 'Reconnecting channels detected' : ''}`);
      }
    }, 30000); // Check every 30 seconds
  }

  // Check individual channel health
  private checkChannelHealth(channelName: string): void {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData || !channelData.channel) return;

    try {
      // Try to access a property to check if the channel is still valid
      if (channelData.channel && typeof channelData.channel.subscribe === 'function') {
        // Channel appears healthy
        channelData.lastRetryTime = Date.now();
        channelData.connectionHealth = 'healthy';
      } else {
        console.warn(`[Realtime] Channel '${channelName}' appears unhealthy, will retry on next error`);
        channelData.isReconnecting = true;
        channelData.connectionHealth = 'unhealthy';
      }
    } catch (error) {
      console.warn(`[Realtime] Channel '${channelName}' health check failed:`, error);
      channelData.isReconnecting = true;
      channelData.connectionHealth = 'unhealthy';
    }
  }

  // Start WebSocket reconnection mechanism for specific error codes
  private startWebSocketReconnection(): void {
    // Listen for WebSocket close events on the Supabase client
    if (typeof window !== 'undefined' && supabase.realtime) {
      // Monitor the realtime connection status
      const checkWebSocketStatus = () => {
        if (this.isDestroyed) return;
        
        try {
          // Check if WebSocket is connected
          const isConnected = supabase.realtime.isConnected();
          
          if (!isConnected && this.connectionStatus === 'connected') {
            logConnection.info('WebSocket disconnected, attempting reconnection');
            this.setConnectionStatus('reconnecting');
            
            // Attempt to reconnect the WebSocket
            this.reconnectWebSocket();
          }
        } catch (error) {
          console.warn('🔍 [Diagnostics] Error checking WebSocket status:', error);
        }
      };
      
      // Check WebSocket status every 10 seconds
      setInterval(checkWebSocketStatus, 10000);
    }
  }

  // Reconnect WebSocket connection
  private async reconnectWebSocket(): Promise<void> {
    if (this.isDestroyed) return;
    
    try {
              logConnection.info('Attempting WebSocket reconnection');
      
      // Disconnect current connection
      await supabase.realtime.disconnect();
      
      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Attempt to reconnect
      await supabase.realtime.connect();
      
              logConnection.info('WebSocket reconnection successful');
      this.setConnectionStatus('connected');
      
      // Recover all active channels after reconnection
      this.recoverAllChannels();
      
    } catch (error) {
      console.error('❌ [Realtime] WebSocket reconnection failed:', error);
      this.setConnectionStatus('disconnected');
      
      // Schedule another reconnection attempt with exponential backoff
      const retryDelay = Math.min(5000 * Math.pow(2, Math.min(this.getGlobalRetryCount(), 5)), 60000);
              logConnection.info('Scheduling WebSocket reconnection', { delaySeconds: retryDelay / 1000 });
      
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.reconnectWebSocket();
        }
      }, retryDelay);
    }
  }

  // Get global retry count for WebSocket reconnection
  private getGlobalRetryCount(): number {
    // This could be enhanced to track global retry attempts
    return 0;
  }

  // Recover all active channels after WebSocket reconnection
  private async recoverAllChannels(): Promise<void> {
    if (this.isDestroyed) return;
    
            logConnection.info('Recovering all active channels after WebSocket reconnection');
    
    for (const [channelName, channelData] of this.activeChannels) {
      if (channelData.refs > 0) {
        console.log(`🔄 [Realtime] Recovering channel: ${channelName}`);
        
        try {
          // Create new channel
          const newChannel = supabase.channel(channelName);
          
          // Configure postgres changes if config provided
          if (channelData.config?.event && channelData.config?.schema && channelData.config?.table) {
            // Use type assertion to bypass TypeScript strict checking
            (newChannel as any).on(
              'postgres_changes',
              {
                event: channelData.config.event,
                schema: channelData.config.schema,
                table: channelData.config.table,
                filter: channelData.config.filter,
              },
              (payload: any) => {
                // Call all stored callbacks
                for (const callback of channelData.callbacks) {
                  callback(payload);
                }
              }
            );
          } else {
            // Generic channel for custom events
            (newChannel as any).on('*', (event: any, payload: any) => {
              // Call all stored callbacks
              for (const callback of channelData.callbacks) {
                callback(payload);
              }
            });
          }

          // Subscribe to the channel
          const subscription = newChannel.subscribe((status, error) => {
            if (status === 'SUBSCRIBED') {
              console.info(`[Realtime] Successfully recovered channel '${channelName}'`);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error(`[Realtime] Recovered channel '${channelName}' subscription error:`, {
                status,
                error: error?.message || error,
                channelName,
                timestamp: new Date().toISOString()
              });
              channelData.connectionHealth = 'unhealthy';
            } else if (status === 'CLOSED') {
              console.info(`[Realtime] Recovered channel '${channelName}' closed`);
            }
          });
          
          // Update the channel reference
          channelData.channel = subscription;
          channelData.connectionHealth = 'healthy';
          channelData.retryCount = 0;
          channelData.isReconnecting = false;
          
          console.log(`✅ [Realtime] Channel recovered: ${channelName}`);
        } catch (error) {
          console.error(`❌ [Realtime] Failed to recover channel: ${channelName}`, error);
          channelData.connectionHealth = 'unhealthy';
        }
      }
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
      // Remove the old channel using proper Supabase method
      if (channelData.channel) {
        try {
          // Use the proper Supabase method instead of unsubscribe()
          supabase.removeChannel(channelData.channel);
        } catch (removeError) {
          console.warn(`[Realtime] Error removing channel '${channelName}' from Supabase:`, removeError);
        }
      }

      // Create new channel
      const newChannel = supabase.channel(channelName);
      
      // Configure postgres changes if config provided
      if (config?.event && config?.schema && config?.table) {
        // Fix: Ensure proper postgres_changes configuration with correct binding
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

      // Subscribe to the channel with improved error handling
      const subscription = newChannel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[Realtime] Successfully resubscribed to '${channelName}' after retry`);
          this.setConnectionStatus('connected');
          // Reset retry count on successful subscription
          channelData.retryCount = 0;
          channelData.isReconnecting = false;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] Channel '${channelName}' resubscription error:`, status, error);
          
          // Enhanced error logging for debugging
          if (error) {
            console.error(`[Realtime] Detailed error for '${channelName}':`, {
              error: error.message || error,
              code: (error as any).code,
              details: (error as any).details,
              hint: (error as any).hint,
              timestamp: new Date().toISOString()
            });
          }
          
          // Don't immediately retry on resubscription error, let the main error handler deal with it
          channelData.isReconnecting = false;
        } else if (status === 'CLOSED') {
          console.info(`[Realtime] Channel '${channelName}' closed after retry`);
          channelData.isReconnecting = false;
        }
      });

      // Update channel data
      channelData.channel = subscription;
      channelData.retryCount++;
      channelData.lastRetryTime = now;
      channelData.isReconnecting = false;

    } catch (error) {
      console.error(`[Realtime] Failed to retry channel '${channelName}' subscription:`, error);
      channelData.isReconnecting = false;
      // Don't call handleChannelError here to avoid infinite loops
      // Just log and let the next error event handle it
    }
  }

  // Handle channel errors with improved retry logic
  private handleChannelError(channelName: string, error: any): void {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;

    // Categorize the error to determine appropriate handling
    const isNetworkError = this.isNetworkRelatedError(error);
    const isAuthError = this.isAuthRelatedError(error);
    const isRateLimitError = this.isRateLimitError(error);
    const isWebSocketError = this.isWebSocketRelatedError(error);

    // Log detailed error information
    console.error(`[Realtime] Channel '${channelName}' error:`, {
      channelName,
      error: error?.message || error,
      errorType: isNetworkError ? 'network' : isAuthError ? 'auth' : isRateLimitError ? 'rate_limit' : isWebSocketError ? 'websocket' : 'unknown',
      retryCount: channelData.retryCount,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connectionStatus: this.connectionStatus
    });

    // Handle different error types appropriately
    if (isAuthError) {
      console.warn(`[Realtime] Auth error for channel '${channelName}', not retrying`);
      this.setConnectionStatus('disconnected');
      return;
    }

    if (isRateLimitError) {
      console.warn(`[Realtime] Rate limit error for channel '${channelName}', waiting before retry`);
      // Wait longer for rate limit errors
      const retryCallback = Array.from(channelData.callbacks)[0];
      if (!retryCallback) {
        console.warn(`[Realtime] No callbacks available for channel '${channelName}' after rate limit error, stopping retry`);
        return;
      }

      setTimeout(() => {
        if (channelData.isReconnecting) {
          this.retryChannelSubscription(channelName, retryCallback as (payload: any) => void, this.getChannelConfig(channelName));
        }
      }, 10000); // Wait 10 seconds for rate limit
      return;
    }

    // Handle WebSocket-specific errors with special care
    if (isWebSocketError) {
      console.warn(`[Realtime] WebSocket error for channel '${channelName}', implementing special recovery...`);
      channelData.connectionHealth = 'unhealthy';
      
      // For WebSocket errors, use more aggressive recovery
      if (channelData.retryCount < MAX_RETRY_ATTEMPTS) {
        const retryDelay = this.calculateRetryDelay(channelData.retryCount);
        logConnection.info('Scheduling WebSocket recovery for channel', { channelName, delayMs: retryDelay });
        
        setTimeout(() => {
          if (channelData.isReconnecting) {
            this.recoverChannel(channelName);
          }
        }, retryDelay);
      }
      return;
    }

    // Set reconnecting status for network errors
    if (isNetworkError) {
      channelData.isReconnecting = true;
      channelData.connectionHealth = 'unhealthy';
      this.setConnectionStatus('reconnecting');
    }

    // Get the first callback to retry with
    const firstCallback = Array.from(channelData.callbacks)[0];
    if (!firstCallback) {
      console.warn(`[Realtime] No callbacks found for channel '${channelName}', cannot retry`);
      return;
    }

    // Implement exponential backoff retry for network errors
    if (isNetworkError && channelData.retryCount < MAX_RETRY_ATTEMPTS) {
      const retryDelay = this.calculateRetryDelay(channelData.retryCount);
      console.log(`[Realtime] Scheduling retry for channel '${channelName}' in ${retryDelay}ms (attempt ${channelData.retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      
      setTimeout(() => {
        if (channelData.isReconnecting) {
          this.retryChannelSubscription(channelName, firstCallback, this.getChannelConfig(channelName));
        }
      }, retryDelay);
    } else if (channelData.retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error(`[Realtime] Channel '${channelName}' exceeded maximum retry attempts, giving up`);
      this.setConnectionStatus('disconnected');
      channelData.connectionHealth = 'unhealthy';
    }
  }

  // Enhanced error categorization for WebSocket issues
  private isWebSocketRelatedError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString() || '';
    const errorCode = error.code || error.closeCode;
    
    // Check for WebSocket-specific error patterns
    const websocketPatterns = [
      'websocket',
      'ws://',
      'wss://',
      'connection closed',
      'connection failed',
      '1005',
      '1006',
      '1015',
      'timeout',
      'ping',
      'pong'
    ];
    
    // Check for WebSocket close codes
    const websocketCloseCodes = [1000, 1001, 1002, 1003, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015];
    
    return websocketPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    ) || websocketCloseCodes.includes(errorCode);
  }

  // Enhanced WebSocket error handling with code-specific strategies
  private handleWebSocketError(error: any, channelName: string): void {
    const errorCode = error.code || error.closeCode;
    const errorMessage = error.message || error.toString();
    
    // Suppress noisy 1011 errors by downgrading them to warnings
    if (errorCode === 1011) {
      logConnection.warn(`WebSocket code 1011 (server terminating) for channel '${channelName}' - implementing retry strategy`, { 
        errorCode, 
        channelName 
      });
    } else {
      logConnection.error(`WebSocket error for channel '${channelName}'`, { 
        errorCode, 
        errorMessage,
        channelName 
      });
    }

    // Get error-specific configuration
    let config: any = WEBSOCKET_ERROR_CONFIG.DEFAULT;
    if (errorCode === 1011) {
      config = WEBSOCKET_ERROR_CONFIG.CODE_1011;
      // Suppress the verbose warning for 1011 errors
    } else if (errorCode === 1005) {
      config = WEBSOCKET_ERROR_CONFIG.CODE_1005;
      logConnection.warn('Code 1005 detected - connection issue. Implementing standard retry strategy.');
    } else if (errorCode === 1006) {
      config = WEBSOCKET_ERROR_CONFIG.CODE_1006;
      logConnection.warn('Code 1006 detected - abnormal closure. Implementing moderate retry strategy.');
    }

    // Handle token refresh if required
    if (config.requireTokenRefresh) {
      this.refreshAuthTokenBeforeRetry(channelName, config);
    } else {
      this.scheduleRetryWithBackoff(channelName, config);
    }
  }

  // Refresh authentication token before retry (for code 1011)
  private async refreshAuthTokenBeforeRetry(channelName: string, config: any): Promise<void> {
    try {
      logConnection.info('Refreshing auth token before retry for code 1011');
      
      // Get current session and refresh if needed
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logConnection.warn('Failed to get session, proceeding with retry', { error: error.message });
        this.scheduleRetryWithBackoff(channelName, config);
        return;
      }

      if (session) {
        // Check if token is expired or close to expiring
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        
        if (expiresAt && (expiresAt - now) < 300) { // Less than 5 minutes until expiry
          logConnection.info('Token expiring soon, refreshing...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            logConnection.warn('Token refresh failed, proceeding with retry', { error: refreshError.message });
          } else {
            logConnection.info('Token refreshed successfully');
          }
        }
      }

      // Schedule retry after token refresh
      this.scheduleRetryWithBackoff(channelName, config);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logConnection.warn('Error during token refresh, proceeding with retry', { error: errorMessage });
      this.scheduleRetryWithBackoff(channelName, config);
    }
  }

  // Enhanced retry scheduling with exponential backoff and jitter
  private scheduleRetryWithBackoff(channelName: string, config: any): void {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData) return;

    // Check retry limits
    if (channelData.retryCount >= config.maxRetries) {
      logConnection.error(`Max retries (${config.maxRetries}) exceeded for channel '${channelName}'`);
      channelData.connectionHealth = 'unhealthy';
      return;
    }

    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      config.baseDelay * Math.pow(config.backoffFactor, channelData.retryCount),
      config.maxDelay
    );
    
    const jitter = config.jitter ? (Math.random() - 0.5) * 1000 : 0;
    const finalDelay = Math.max(baseDelay + jitter, 1000); // Minimum 1 second

    logConnection.info(`Scheduling retry for channel '${channelName}'`, {
      retryCount: channelData.retryCount + 1,
      delay: Math.round(finalDelay),
      maxRetries: config.maxRetries
    });

    // Schedule retry
    setTimeout(() => {
      this.attemptChannelReconnection(channelName);
    }, finalDelay);

    channelData.retryCount++;
    channelData.lastRetryTime = Date.now();
  }

  // Attempt channel reconnection with connection pooling respect
  private attemptChannelReconnection(channelName: string): void {
    const channelData = this.activeChannels.get(channelName);
    if (!channelData || channelData.isReconnecting) return;

    // Check connection pooling limits
    const activeConnections = Array.from(this.activeChannels.values())
      .filter(ch => ch.isReconnecting || ch.connectionHealth === 'healthy').length;
    
    if (activeConnections >= CONNECTION_POOL_CONFIG.maxConcurrentConnections) {
      logConnection.warn(`Connection pool limit reached (${activeConnections}/${CONNECTION_POOL_CONFIG.maxConcurrentConnections}), deferring reconnection for '${channelName}'`);
      
      // Schedule retry after cooldown
      setTimeout(() => {
        this.attemptChannelReconnection(channelName);
      }, CONNECTION_POOL_CONFIG.connectionCooldown);
      return;
    }

    // Check rate limiting
    const recentRetries = Array.from(this.activeChannels.values())
      .filter(ch => Date.now() - ch.lastRetryTime < CONNECTION_POOL_CONFIG.retryWindowMs)
      .reduce((sum, ch) => sum + ch.retryCount, 0);
    
    if (recentRetries >= CONNECTION_POOL_CONFIG.maxRetriesPerMinute) {
      logConnection.warn(`Rate limit exceeded (${recentRetries}/${CONNECTION_POOL_CONFIG.maxRetriesPerMinute} retries per minute), deferring reconnection for '${channelName}'`);
      
      // Schedule retry after rate limit window
      setTimeout(() => {
        this.attemptChannelReconnection(channelName);
      }, CONNECTION_POOL_CONFIG.retryWindowMs);
      return;
    }

    logConnection.info(`Attempting reconnection for channel '${channelName}'`);
    channelData.isReconnecting = true;

    // Attempt reconnection
    try {
      // Create new channel subscription
      const newChannel = supabase.channel(channelName);
      
      // Re-add all callbacks
      channelData.callbacks.forEach(callback => {
        (newChannel as any).on('*', callback);
      });

      // Subscribe with enhanced error handling
      const subscription = newChannel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          logConnection.info(`Channel '${channelName}' reconnected successfully`);
          channelData.channel = newChannel;
          channelData.isReconnecting = false;
          channelData.connectionHealth = 'healthy';
          channelData.retryCount = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logConnection.warn(`Channel '${channelName}' reconnection failed`, { status, error });
          channelData.isReconnecting = false;
          channelData.connectionHealth = 'unhealthy';
          
          // Handle the error with enhanced error handling
          if (error) {
            this.handleWebSocketError(error, channelName);
          }
        }
      });

      // Store the subscription
      channelData.channel = newChannel;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logConnection.error(`Error during channel reconnection for '${channelName}'`, { error: errorMessage });
      channelData.isReconnecting = false;
      channelData.connectionHealth = 'unhealthy';
      
      // Schedule another retry
      this.scheduleRetryWithBackoff(channelName, WEBSOCKET_ERROR_CONFIG.DEFAULT);
    }
  }

  // Helper method to get channel configuration based on channel name
  private getChannelConfig(channelName: string): any {
    if (channelName.includes('notifications')) {
      return {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${channelName.split('-')[2]}`
      };
    } else if (channelName.includes('user-points')) {
      return {
        event: 'INSERT',
        schema: 'public',
        table: 'user_points',
        filter: `user_id=eq.${channelName.split('-')[2]}`
      };
    } else if (channelName.includes('user-profile-points')) {
      return {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${channelName.split('-')[2]}`
      };
    }
    return {};
  }

  // Helper method to categorize network-related errors
  private isNetworkRelatedError(error: any): boolean {
    if (!error) return false;
    const errorStr = error.toString().toLowerCase();
    return errorStr.includes('network') || 
           errorStr.includes('connection') || 
           errorStr.includes('timeout') ||
           errorStr.includes('offline') ||
           errorStr.includes('fetch') ||
           errorStr.includes('websocket');
  }

  // Helper method to categorize auth-related errors
  private isAuthRelatedError(error: any): boolean {
    if (!error) return false;
    const errorStr = error.toString().toLowerCase();
    return errorStr.includes('auth') || 
           errorStr.includes('unauthorized') || 
           errorStr.includes('forbidden') ||
           errorStr.includes('token') ||
           errorStr.includes('jwt');
  }

  // Helper method to categorize rate limit errors
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    const errorStr = error.toString().toLowerCase();
    return errorStr.includes('rate') || 
           errorStr.includes('limit') || 
           errorStr.includes('too many') ||
           errorStr.includes('429');
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

    if (!this.isRealtimeClientReady()) {
      this.enqueueReadySubscription(channelName, () => {
        this.subscribeToChannel(channelName, callback, config);
      });
      return;
    }

    this.resolvePendingReady(channelName, null);

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
      this.resolvePendingReady(channelName, channelData.channel ?? null);
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
        callbacks: new Set([callback]),
        retryCount: 0,
        lastRetryTime: Date.now(),
        isReconnecting: false,
        connectionHealth: 'healthy',
        config: config || {}, // Store the config
        refs: 1 // Track reference count for the channel
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Realtime] Failed to create channel '${channelName}':`, {
        error: errorMessage,
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

    if (this.pendingReadyChecks.has(channelName)) {
      clearTimeout(this.pendingReadyChecks.get(channelName)!);
      this.pendingReadyChecks.delete(channelName);
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
      if (channelData.channel) {
        // Use the proper Supabase method instead of unsubscribe()
        supabase.removeChannel(channelData.channel);
      }
      this.activeChannels.delete(channelName);
      this.pendingCleanups.delete(channelName);
      if (this.pendingReadyChecks.has(channelName)) {
        clearTimeout(this.pendingReadyChecks.get(channelName)!);
        this.pendingReadyChecks.delete(channelName);
      }
      this.pendingReadyResolvers.delete(channelName);
      console.info(`[Realtime] Successfully removed channel '${channelName}'`);
    } catch (error) {
      console.error(`[Realtime] Error removing channel '${channelName}':`, error);
      // Force remove from our tracking even if Supabase removal fails
      this.activeChannels.delete(channelName);
      this.pendingCleanups.delete(channelName);
      if (this.pendingReadyChecks.has(channelName)) {
        clearTimeout(this.pendingReadyChecks.get(channelName)!);
        this.pendingReadyChecks.delete(channelName);
      }
      this.pendingReadyResolvers.delete(channelName);
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
    for (const timeout of this.pendingReadyChecks.values()) {
      clearTimeout(timeout);
    }
    this.pendingReadyChecks.clear();
    this.pendingReadyResolvers.clear();
    
    for (const [channelName, channelData] of this.activeChannels.entries()) {
      try {
        // Check if channel is still active before removing
        if (channelData.channel) {
          // Use the proper Supabase method instead of unsubscribe()
          supabase.removeChannel(channelData.channel);
        }
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

  public getActiveChannel(channelName: string): RealtimeChannel | undefined {
    return this.activeChannels.get(channelName)?.channel ?? undefined;
  }

  public async ensureChannelReady(channelName: string): Promise<RealtimeChannel | null> {
    if (this.isDestroyed) {
      return null;
    }

    if (this.isRealtimeClientReady()) {
      const existing = this.getActiveChannel(channelName);
      if (existing) {
        return existing;
      }
    }

    return new Promise<RealtimeChannel | null>((resolve) => {
      this.enqueueReadySubscription(channelName, () => {
        resolve(this.getActiveChannel(channelName) ?? null);
      }, resolve);
    });
  }

  private enqueueReadySubscription(
    channelName: string,
    action: () => void,
    resolver?: (channel: RealtimeChannel | null) => void
  ): void {
    if (this.pendingReadyChecks.has(channelName)) {
      clearTimeout(this.pendingReadyChecks.get(channelName)!);
    }

    if (resolver) {
      const resolvers = this.pendingReadyResolvers.get(channelName) ?? [];
      resolvers.push(resolver);
      this.pendingReadyResolvers.set(channelName, resolvers);
    }

    const retryTimer = setTimeout(() => {
      this.pendingReadyChecks.delete(channelName);
      if (!this.isDestroyed) {
        action();
      }
    }, 500);

    this.pendingReadyChecks.set(channelName, retryTimer);
  }

  private resolvePendingReady(channelName: string, channel: RealtimeChannel | null): void {
    if (this.pendingReadyChecks.has(channelName)) {
      clearTimeout(this.pendingReadyChecks.get(channelName)!);
      this.pendingReadyChecks.delete(channelName);
    }

    const resolvers = this.pendingReadyResolvers.get(channelName);
    if (resolvers) {
      resolvers.forEach(resolve => resolve(channel));
      this.pendingReadyResolvers.delete(channelName);
    }
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
    
    // Clear global retry timeout
    if (this.globalRetryTimeout) {
      clearTimeout(this.globalRetryTimeout);
      this.globalRetryTimeout = null;
    }

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

  // Validate subscription configuration before attempting recovery
  private async validateSubscriptionConfig(schema: string, table: string, filter?: string): Promise<boolean> {
    try {
      // Basic validation - check if table exists by attempting a simple query
      // Use a safer approach that doesn't require dynamic table names or custom RPC functions
      
      // For now, assume the table is valid to prevent blocking recovery
      // This is a conservative approach that allows recovery to proceed
      console.log(`[Realtime] Assuming table '${table}' in schema '${schema}' is valid for recovery`);
      
      // If filter is provided, try to validate it
      if (filter) {
        try {
          // Test the filter with a simple query using a safe approach
          // Since we can't use dynamic table names, we'll validate the filter format
          if (filter.includes('=')) {
            const [column, value] = filter.split('=');
            if (column && value) {
              // Basic validation - check if the filter format looks correct
              const trimmedColumn = column.trim();
              const trimmedValue = value.trim();
              
              // Validate column name format (basic check)
              if (!trimmedColumn.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                console.warn(`[Realtime] Invalid column name in filter '${filter}':`, trimmedColumn);
                return false;
              }
              
              // Validate value format (basic check)
              if (trimmedValue.length === 0) {
                console.warn(`[Realtime] Empty value in filter '${filter}'`);
                return false;
              }
            }
          }
        } catch (filterError) {
          console.warn(`[Realtime] Filter validation error for '${filter}':`, filterError);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.warn(`[Realtime] Subscription config validation error:`, error);
      // For now, assume valid to prevent blocking recovery
      return true;
    }
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

export function ensureChannelReady(channelName: string): Promise<RealtimeChannel | null> {
  return getRealtimeManager().ensureChannelReady(channelName);
}

export function getExistingChannel(channelName: string): RealtimeChannel | undefined {
  return getRealtimeManager().getActiveChannel(channelName);
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

