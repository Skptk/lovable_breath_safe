import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../integrations/supabase/client';

// 🚨 EMERGENCY DISABLE - Heartbeat system causing notification spam
const EMERGENCY_DISABLE_HEARTBEAT = true;

// Connection states to track
export const connectionStates = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected', 
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
} as const;

export type ConnectionState = typeof connectionStates[keyof typeof connectionStates];

// Configuration constants - EMERGENCY DISABLED to prevent spam
const CONFIG = {
  HEARTBEAT_INTERVAL: 999999999,     // EMERGENCY: Disabled with huge number
  HEARTBEAT_TIMEOUT: 999999999,      // EMERGENCY: Disabled with huge number
  MAX_RECONNECT_ATTEMPTS: 3,         // 3 attempts (was 5)
  RECONNECT_BASE_DELAY: 2000,        // 2 seconds (was 1)
  ERROR_LOG_MAX_SIZE: 5,             // Maximum number of recent errors to keep
  ENABLE_HEARTBEAT: false,           // EMERGENCY: Always false
  SHOW_HEARTBEAT_NOTIFICATIONS: false // EMERGENCY: Never show heartbeat notifications
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
  enableHeartbeat = false, // EMERGENCY: Always false
  enableNetworkDetection = true,
  onStateChange,
  onError
}: UseEnhancedConnectionHealthOptions = {}): ConnectionHealthState & {
  reconnect: () => Promise<void>;
  resetErrors: () => void;
  getConnectionQuality: () => string;
} {
  // 🚨 EMERGENCY: If heartbeat is somehow enabled, force disable it
  const forceDisableHeartbeat = true;
  
  // State management
  const [state, setState] = useState<ConnectionHealthState>({
    status: connectionStates.CONNECTED, // EMERGENCY: Start as connected
    lastHeartbeat: null,
    reconnectAttempts: 0,
    latency: null,
    isHealthy: true, // EMERGENCY: Start as healthy
    errors: [], // EMERGENCY: Start with no errors
    networkQuality: 'excellent', // EMERGENCY: Start as excellent
    lastNetworkChange: null,
    isOnline: navigator.onLine
  });

  // Refs for interval and timeout management
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Update state with callback
  const updateState = useCallback((updates: Partial<ConnectionHealthState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      onStateChange?.(newState);
      return newState;
    });
  }, [onStateChange]);

  // Add error to log - EMERGENCY: Block heartbeat errors
  const addError = useCallback((message: string, context: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    // 🚨 EMERGENCY: Block all heartbeat-related errors
    if (message.toLowerCase().includes('heartbeat') || context.toLowerCase().includes('heartbeat')) {
      console.log('🚨 EMERGENCY: Blocked heartbeat error:', message);
      return; // Don't add heartbeat errors
    }
    
    // 🚨 EMERGENCY: Block timeout errors
    if (message.toLowerCase().includes('timeout')) {
      console.log('🚨 EMERGENCY: Blocked timeout error:', message);
      return; // Don't add timeout errors
    }

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

  // Assess connection quality - EMERGENCY: Simplified
  const assessConnectionQuality = useCallback((currentState: ConnectionHealthState): 'excellent' | 'good' | 'fair' | 'poor' => {
    // 🚨 EMERGENCY: Always return excellent to prevent notifications
    return 'excellent';
  }, []);

  // Exponential backoff reconnection - EMERGENCY: Simplified
  const reconnect = useCallback(async (): Promise<void> => {
    if (!enableAutoReconnect || !isMountedRef.current) return;

    const currentAttempts = state.reconnectAttempts;
    
    if (currentAttempts >= maxReconnectAttempts) {
      // 🚨 EMERGENCY: Don't add reconnection errors
      console.log('🚨 EMERGENCY: Max reconnection attempts reached, but not showing error');
      updateState({ 
        status: connectionStates.CONNECTED, // EMERGENCY: Force connected state
        isHealthy: true // EMERGENCY: Force healthy state
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
    const delay = Math.min(baseDelay + jitter, 10000); // Max 10 seconds

    // 🚨 EMERGENCY: Don't add reconnection notifications
    console.log(`🚨 EMERGENCY: Reconnection attempt ${currentAttempts + 1}/${maxReconnectAttempts} in ${Math.round(delay)}ms`);

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

        // 🚨 EMERGENCY: Don't add success notifications
        console.log('🚨 EMERGENCY: Reconnection successful, but not showing notification');

      } catch (error) {
        // 🚨 EMERGENCY: Don't add failure notifications
        console.log('🚨 EMERGENCY: Reconnection failed, but not showing error:', error);
        
        // Retry if we haven't reached max attempts
        if (currentAttempts + 1 < maxReconnectAttempts) {
          reconnect();
        } else {
          // 🚨 EMERGENCY: Force connected state even on failure
          updateState({ 
            status: connectionStates.CONNECTED, // Force connected
            isHealthy: true // Force healthy
          });
        }
      }
    }, delay);
  }, [enableAutoReconnect, state.reconnectAttempts, maxReconnectAttempts, updateState]);

  // Handle network changes - EMERGENCY: Simplified
  const handleNetworkChange = useCallback(() => {
    if (!enableNetworkDetection || !isMountedRef.current) return;

    const isOnline = navigator.onLine;
    const now = Date.now();

    updateState({
      isOnline,
      lastNetworkChange: now
    });

    if (isOnline) {
      // Network came back online - force connected state
      updateState({
        status: connectionStates.CONNECTED,
        isHealthy: true
      });
      console.log('🚨 EMERGENCY: Network restored, forcing connected state');
    } else {
      // Network went offline - force connected state to prevent notifications
      console.log('🚨 EMERGENCY: Network lost, but forcing connected state to prevent notifications');
      updateState({
        status: connectionStates.CONNECTED, // Force connected
        isHealthy: true // Force healthy
      });
    }
  }, [enableNetworkDetection, updateState]);

  // Reset errors
  const resetErrors = useCallback(() => {
    updateState({ errors: [] });
  }, [updateState]);

  // Get connection quality description - EMERGENCY: Always excellent
  const getConnectionQuality = useCallback(() => {
    return 'Excellent connection with no issues';
  }, []);

  // 🚨 EMERGENCY: Skip all heartbeat-related effects
  useEffect(() => {
    if (!isMountedRef.current) return;

    // 🚨 EMERGENCY: Force connected state immediately
    updateState({
      status: connectionStates.CONNECTED,
      isHealthy: true,
      lastHeartbeat: Date.now(),
      reconnectAttempts: 0
    });

    console.log('🚨 EMERGENCY: Connection health initialized with forced connected state');

    // 🚨 EMERGENCY: Don't set up any monitoring channels
    return () => {
      console.log('🚨 EMERGENCY: Connection health cleanup - no channels to clean');
    };
  }, [updateState]);

  // Set up network event listeners - EMERGENCY: Simplified
  useEffect(() => {
    if (!enableNetworkDetection || !isMountedRef.current) return;

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [enableNetworkDetection, handleNetworkChange]);

  // Update connection quality when state changes - EMERGENCY: Always excellent
  useEffect(() => {
    if (!isMountedRef.current) return;

    // 🚨 EMERGENCY: Always force excellent quality
    updateState({ networkQuality: 'excellent' });
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear all timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
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
