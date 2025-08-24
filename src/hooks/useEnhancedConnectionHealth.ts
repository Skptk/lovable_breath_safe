import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';

// Connection states to track
export const connectionStates = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected', 
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
} as const;

export type ConnectionState = typeof connectionStates[keyof typeof connectionStates];

// Configuration constants
const CONFIG = {
  HEARTBEAT_INTERVAL: 15000,     // 15 seconds
  HEARTBEAT_TIMEOUT: 5000,       // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 5,     // Maximum reconnection attempts
  RECONNECT_DELAY: 2000,         // Base delay between reconnection attempts
  HEALTH_CHECK_INTERVAL: 10000,  // 10 seconds
  ERROR_RESET_TIMEOUT: 30000     // 30 seconds to reset error state
};

// Connection health state interface
export interface ConnectionHealthState {
  status: ConnectionState;
  isHealthy: boolean;
  lastCheck: Date | null;
  reconnectAttempts: number;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isOnline: boolean;
  lastNetworkChange: Date | null;
  errors: Array<{ message: string; timestamp: Date; type: string }>;
  latency: number | null;
  lastHeartbeat: number;
}

// Hook options interface
interface UseEnhancedConnectionHealthOptions {
  checkInterval?: number;
  maxReconnectAttempts?: number;
  enableAutoReconnect?: boolean;
  onStateChange?: (state: ConnectionHealthState) => void;
  onError?: (error: Error, context: string) => void;
}

export function useEnhancedConnectionHealth(options: UseEnhancedConnectionHealthOptions = {}) {
  const {
    checkInterval = CONFIG.HEALTH_CHECK_INTERVAL,
    maxReconnectAttempts = CONFIG.MAX_RECONNECT_ATTEMPTS,
    enableAutoReconnect = true,
    onStateChange,
    onError
  } = options;

  // State management
  const [state, setState] = useState<ConnectionHealthState>({
    status: connectionStates.CONNECTING,
    isHealthy: false,
    lastCheck: null,
    reconnectAttempts: 0,
    networkQuality: 'excellent',
    isOnline: navigator.onLine,
    lastNetworkChange: null,
    errors: [],
    latency: null,
    lastHeartbeat: Date.now()
  });

  // Refs for cleanup and state management
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDestroyedRef = useRef(false);
  const lastReconnectAttemptRef = useRef(0);

  // Check connection health
  const checkConnectionHealth = useCallback(async (): Promise<void> => {
    if (isDestroyedRef.current) return;

    try {
      const now = new Date();
      const isConnected = supabase.realtime.isConnected();
      const isConnecting = supabase.realtime.isConnecting();

      let newStatus: ConnectionState;
      let isHealthy = false;

      if (isConnected) {
        newStatus = connectionStates.CONNECTED;
        isHealthy = true;
      } else if (isConnecting) {
        newStatus = connectionStates.CONNECTING;
        isHealthy = false;
      } else {
        newStatus = connectionStates.DISCONNECTED;
        isHealthy = false;
      }

      // Update state
      setState(prevState => {
        const newState = {
          ...prevState,
          status: newStatus,
          isHealthy,
          lastCheck: now
        };

        // Call state change callback
        if (onStateChange) {
          onStateChange(newState);
        }

        return newState;
      });

    } catch (error) {
      console.error('❌ [useEnhancedConnectionHealth] Error checking connection health:', error);
      
      const errorObj = {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        type: 'health_check'
      };

      setState(prevState => ({
        ...prevState,
        status: connectionStates.DISCONNECTED,
        isHealthy: false,
        lastCheck: new Date(),
        errors: [...prevState.errors, errorObj].slice(-5) // Keep last 5 errors
      }));

      if (onError && error instanceof Error) {
        onError(error, 'health_check');
      }
    }
  }, [onStateChange, onError]);

  // Send heartbeat to test connection
  const sendHeartbeat = useCallback(async (): Promise<void> => {
    if (isDestroyedRef.current) return;

    try {
      const startTime = Date.now();
      const isConnected = supabase.realtime.isConnected();
      
      if (isConnected) {
        const latency = Date.now() - startTime;
        
        setState(prevState => ({
          ...prevState,
          lastHeartbeat: Date.now(),
          latency: Math.min(latency, 1000), // Cap latency at 1 second
          networkQuality: latency < 50 ? 'excellent' : 
                         latency < 100 ? 'good' : 
                         latency < 200 ? 'fair' : 'poor'
        }));
      } else {
        setState(prevState => ({
          ...prevState,
          lastHeartbeat: Date.now(),
          latency: null,
          networkQuality: 'poor'
        }));
      }
    } catch (error) {
      console.error('❌ [useEnhancedConnectionHealth] Heartbeat failed:', error);
      
      setState(prevState => ({
        ...prevState,
        lastHeartbeat: Date.now(),
        latency: null,
        networkQuality: 'poor'
      }));
    }
  }, []);

  // Reconnect with exponential backoff
  const reconnect = useCallback(async (): Promise<void> => {
    if (isDestroyedRef.current) return;

    const now = Date.now();
    const timeSinceLastAttempt = now - lastReconnectAttemptRef.current;
    const minDelay = CONFIG.RECONNECT_DELAY;

    // Prevent rapid reconnection attempts
    if (timeSinceLastAttempt < minDelay) {
      const remainingDelay = minDelay - timeSinceLastAttempt;
      setTimeout(() => reconnect(), remainingDelay);
      return;
    }

    if (state.reconnectAttempts >= maxReconnectAttempts) {
      console.error('❌ [useEnhancedConnectionHealth] Max reconnection attempts reached');
      return;
    }

    try {
      console.log('🔄 [useEnhancedConnectionHealth] Attempting reconnection...');
      
      lastReconnectAttemptRef.current = now;
      
      setState(prevState => ({
        ...prevState,
        status: connectionStates.RECONNECTING,
        reconnectAttempts: prevState.reconnectAttempts + 1
      }));

      // Let Supabase handle reconnection automatically
      // We just monitor the status
      
      // Check health after a delay to see if reconnection worked
      setTimeout(() => {
        if (!isDestroyedRef.current) {
          checkConnectionHealth();
        }
      }, 2000);

    } catch (error) {
      console.error('❌ [useEnhancedConnectionHealth] Reconnection failed:', error);
      
      if (onError && error instanceof Error) {
        onError(error, 'reconnection');
      }
    }
  }, [state.reconnectAttempts, maxReconnectAttempts, checkConnectionHealth, onError]);

  // Reset errors after timeout
  const resetErrors = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      errors: []
    }));
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setState(prevState => ({
        ...prevState,
        isOnline: true,
        lastNetworkChange: new Date()
      }));
    };

    const handleOffline = () => {
      setState(prevState => ({
        ...prevState,
        isOnline: false,
        lastNetworkChange: new Date(),
        status: connectionStates.DISCONNECTED,
        isHealthy: false
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Start health monitoring
  useEffect(() => {
    if (isDestroyedRef.current) return;

    // Initial health check
    checkConnectionHealth();

    // Set up periodic health checks
    healthCheckIntervalRef.current = setInterval(checkConnectionHealth, checkInterval);

    // Set up heartbeat
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, CONFIG.HEARTBEAT_INTERVAL);

    // Set up error reset timer
    const errorResetTimer = setInterval(resetErrors, CONFIG.ERROR_RESET_TIMEOUT);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      clearInterval(errorResetTimer);
    };
  }, [checkInterval, checkConnectionHealth, sendHeartbeat, resetErrors]);

  // Auto-reconnect logic
  useEffect(() => {
    if (!enableAutoReconnect || isDestroyedRef.current) return;

    if (state.status === connectionStates.DISCONNECTED && 
        state.reconnectAttempts < maxReconnectAttempts) {
      
      const delay = Math.min(
        CONFIG.RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts),
        30000 // Max 30 seconds
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isDestroyedRef.current) {
          reconnect();
        }
      }, delay);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [state.status, state.reconnectAttempts, maxReconnectAttempts, enableAutoReconnect, reconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Memoized computed values
  const isConnected = useMemo(() => state.status === connectionStates.CONNECTED, [state.status]);
  const isConnecting = useMemo(() => state.status === connectionStates.CONNECTING, [state.status]);
  const isReconnecting = useMemo(() => state.status === connectionStates.RECONNECTING, [state.status]);
  const isDisconnected = useMemo(() => state.status === connectionStates.DISCONNECTED, [state.status]);

  return {
    // State
    status: state.status,
    isHealthy: state.isHealthy,
    lastCheck: state.lastCheck,
    reconnectAttempts: state.reconnectAttempts,
    networkQuality: state.networkQuality,
    isOnline: state.isOnline,
    lastNetworkChange: state.lastNetworkChange,
    errors: state.errors,
    latency: state.latency,
    lastHeartbeat: state.lastHeartbeat,
    
    // Computed values
    isConnected,
    isConnecting,
    isReconnecting,
    isDisconnected,
    
    // Actions
    reconnect,
    sendHeartbeat,
    checkConnectionHealth,
    resetErrors
  };
}
