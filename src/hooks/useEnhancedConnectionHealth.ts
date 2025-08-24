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
  HEARTBEAT_INTERVAL: 30000,     // 30 seconds between heartbeats
  HEARTBEAT_TIMEOUT: 10000,      // 10 seconds to wait for response
  MAX_RECONNECT_ATTEMPTS: 5,     // Maximum reconnection attempts
  RECONNECT_BASE_DELAY: 1000,    // Base delay for exponential backoff
  MAX_RECONNECT_DELAY: 30000,    // Maximum reconnection delay
  ERROR_LOG_MAX_SIZE: 5          // Maximum number of recent errors to keep
} as const;

// State structure to maintain
export interface ConnectionHealthState {
  status: ConnectionState;
  lastHeartbeat: number | null;
  reconnectAttempts: number;
  latency: number | null;
  isHealthy: boolean;
  errors: Array<{
    timestamp: number;
    message: string;
    context: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  lastNetworkChange: number | null;
  isOnline: boolean;
}

export interface UseEnhancedConnectionHealthOptions {
  checkInterval?: number;
  maxReconnectAttempts?: number;
  enableAutoReconnect?: boolean;
  enableHeartbeat?: boolean;
  enableNetworkDetection?: boolean;
  onStateChange?: (state: ConnectionHealthState) => void;
  onError?: (error: Error, context: string) => void;
}

export function useEnhancedConnectionHealth({
  checkInterval = CONFIG.HEARTBEAT_INTERVAL,
  maxReconnectAttempts = CONFIG.MAX_RECONNECT_ATTEMPTS,
  enableAutoReconnect = true,
  enableHeartbeat = true,
  enableNetworkDetection = true,
  onStateChange,
  onError
}: UseEnhancedConnectionHealthOptions = {}): ConnectionHealthState & {
  reconnect: () => Promise<void>;
  resetErrors: () => void;
  getConnectionQuality: () => string;
} {
  // State management
  const [state, setState] = useState<ConnectionHealthState>({
    status: connectionStates.CONNECTING,
    lastHeartbeat: null,
    reconnectAttempts: 0,
    latency: null,
    isHealthy: true,
    errors: [],
    networkQuality: 'unknown',
    lastNetworkChange: null,
    isOnline: navigator.onLine
  });

  // Refs for interval and timeout management
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatChannelRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Update state with callback
  const updateState = useCallback((updates: Partial<ConnectionHealthState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      onStateChange?.(newState);
      return newState;
    });
  }, [onStateChange]);

  // Add error to log
  const addError = useCallback((message: string, context: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    const error = {
      timestamp: Date.now(),
      message,
      context,
      severity
    };

    setState(prev => ({
      ...prev,
      errors: [error, ...prev.errors.slice(0, CONFIG.ERROR_LOG_MAX_SIZE - 1)]
    }));

    onError?.(new Error(message), context);
  }, [onError]);

  // Calculate latency from heartbeat
  const calculateLatency = useCallback((sentTimestamp: number) => {
    const now = Date.now();
    const latency = now - sentTimestamp;
    
    updateState({ 
      latency,
      lastHeartbeat: now,
      isHealthy: latency < CONFIG.HEARTBEAT_TIMEOUT
    });
  }, [updateState]);

  // Assess connection quality
  const assessConnectionQuality = useCallback((currentState: ConnectionHealthState): 'excellent' | 'good' | 'fair' | 'poor' => {
    const { latency, errors, lastHeartbeat, reconnectAttempts } = currentState;
    
    if (!latency || !lastHeartbeat) return 'unknown';
    
    // Quality factors
    const latencyScore = latency < 100 ? 4 : latency < 300 ? 3 : latency < 1000 ? 2 : 1;
    const errorScore = errors.length === 0 ? 4 : errors.length <= 2 ? 3 : errors.length <= 4 ? 2 : 1;
    const reconnectScore = reconnectAttempts === 0 ? 4 : reconnectAttempts <= 2 ? 3 : reconnectAttempts <= 4 ? 2 : 1;
    
    const totalScore = latencyScore + errorScore + reconnectScore;
    
    if (totalScore >= 10) return 'excellent';
    if (totalScore >= 7) return 'good';
    if (totalScore >= 4) return 'fair';
    return 'poor';
  }, []);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!enableHeartbeat || !isMountedRef.current) return;

    try {
      // Create dedicated heartbeat channel if not exists
      if (!heartbeatChannelRef.current) {
        heartbeatChannelRef.current = supabase.channel('app-heartbeat');
        await heartbeatChannelRef.current.subscribe();
      }

      const timestamp = Date.now();
      
      // Send ping
      heartbeatChannelRef.current.send({
        type: 'broadcast',
        event: 'ping',
        payload: { timestamp }
      });

      // Set timeout for pong response
      heartbeatTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          addError('Heartbeat timeout - no response received', 'heartbeat', 'high');
          updateState({ 
            isHealthy: false,
            status: connectionStates.DISCONNECTED
          });
        }
      }, CONFIG.HEARTBEAT_TIMEOUT);

    } catch (error) {
      addError(`Heartbeat failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'heartbeat', 'high');
    }
  }, [enableHeartbeat, addError, updateState]);

  // Handle heartbeat response
  const handleHeartbeatResponse = useCallback((payload: any) => {
    if (payload.timestamp && typeof payload.timestamp === 'number') {
      calculateLatency(payload.timestamp);
      
      // Clear timeout
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
    }
  }, [calculateLatency]);

  // Exponential backoff reconnection
  const reconnect = useCallback(async (): Promise<void> => {
    if (!enableAutoReconnect || !isMountedRef.current) return;

    const currentAttempts = state.reconnectAttempts;
    
    if (currentAttempts >= maxReconnectAttempts) {
      addError('Maximum reconnection attempts reached', 'reconnection', 'high');
      updateState({ 
        status: connectionStates.DISCONNECTED,
        isHealthy: false
      });
      return;
    }

    updateState({ 
      status: connectionStates.RECONNECTING,
      reconnectAttempts: currentAttempts + 1
    });

    // Calculate delay with exponential backoff and jitter
    const baseDelay = CONFIG.RECONNECT_BASE_DELAY * Math.pow(2, currentAttempts);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, CONFIG.MAX_RECONNECT_DELAY);

    addError(`Reconnection attempt ${currentAttempts + 1}/${maxReconnectAttempts} in ${Math.round(delay)}ms`, 'reconnection', 'low');

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;

      try {
        // Attempt to reconnect to Supabase
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        // Success - reset state
        updateState({
          status: connectionStates.CONNECTED,
          reconnectAttempts: 0,
          isHealthy: true,
          lastHeartbeat: Date.now()
        });

        addError('Reconnection successful', 'reconnection', 'low');
        
        // Restart heartbeat
        if (enableHeartbeat) {
          sendHeartbeat();
        }

      } catch (error) {
        addError(`Reconnection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'reconnection', 'medium');
        
        // Retry if we haven't reached max attempts
        if (currentAttempts + 1 < maxReconnectAttempts) {
          reconnect();
        } else {
          updateState({ 
            status: connectionStates.DISCONNECTED,
            isHealthy: false
          });
        }
      }
    }, delay);
  }, [enableAutoReconnect, state.reconnectAttempts, maxReconnectAttempts, addError, updateState, enableHeartbeat, sendHeartbeat]);

  // Handle network changes
  const handleNetworkChange = useCallback(() => {
    if (!enableNetworkDetection || !isMountedRef.current) return;

    const isOnline = navigator.onLine;
    const now = Date.now();

    updateState({
      isOnline,
      lastNetworkChange: now
    });

    if (isOnline) {
      // Network came back online - attempt reconnection
      if (state.status === connectionStates.DISCONNECTED) {
        addError('Network connection restored', 'network', 'low');
        reconnect();
      }
    } else {
      // Network went offline
      addError('Network connection lost', 'network', 'high');
      updateState({
        status: connectionStates.DISCONNECTED,
        isHealthy: false
      });
    }
  }, [enableNetworkDetection, updateState, state.status, addError, reconnect]);

  // Reset errors
  const resetErrors = useCallback(() => {
    updateState({ errors: [] });
  }, [updateState]);

  // Get connection quality description
  const getConnectionQuality = useCallback(() => {
    const quality = assessConnectionQuality(state);
    const descriptions = {
      excellent: 'Excellent connection with low latency',
      good: 'Good connection with acceptable latency',
      fair: 'Fair connection with some latency issues',
      poor: 'Poor connection with significant issues',
      unknown: 'Connection quality unknown'
    };
    return descriptions[quality];
  }, [assessConnectionQuality, state]);

  // Initialize heartbeat channel
  useEffect(() => {
    if (!enableHeartbeat || !isMountedRef.current) return;

    const initHeartbeat = async () => {
      try {
        heartbeatChannelRef.current = supabase.channel('app-heartbeat');
        
        // Listen for pong responses
        heartbeatChannelRef.current.on('broadcast', { event: 'pong' }, handleHeartbeatResponse);
        
        await heartbeatChannelRef.current.subscribe();
        
        // Send initial heartbeat
        sendHeartbeat();
        
      } catch (error) {
        addError(`Failed to initialize heartbeat: ${error instanceof Error ? error.message : 'Unknown error'}`, 'heartbeat', 'high');
      }
    };

    initHeartbeat();
  }, [enableHeartbeat, handleHeartbeatResponse, sendHeartbeat, addError]);

  // Set up heartbeat interval
  useEffect(() => {
    if (!enableHeartbeat || !isMountedRef.current) return;

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, checkInterval);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [enableHeartbeat, checkInterval, sendHeartbeat]);

  // Set up network event listeners
  useEffect(() => {
    if (!enableNetworkDetection || !isMountedRef.current) return;

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [enableNetworkDetection, handleNetworkChange]);

  // Update connection quality when state changes
  useEffect(() => {
    if (!isMountedRef.current) return;

    const quality = assessConnectionQuality(state);
    if (quality !== state.networkQuality) {
      updateState({ networkQuality: quality });
    }
  }, [state, assessConnectionQuality, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear all timeouts and intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Unsubscribe from heartbeat channel
      if (heartbeatChannelRef.current) {
        heartbeatChannelRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    ...state,
    reconnect,
    resetErrors,
    getConnectionQuality
  };
}
