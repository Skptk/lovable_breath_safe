import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

// Connection states to track
export const connectionStates = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected', 
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
} as const;

export type ConnectionState = typeof connectionStates[keyof typeof connectionStates];

// State structure to maintain
export interface ConnectionHealthState {
  status: ConnectionState;
  isHealthy: boolean;
  lastCheck: string | null;
  reconnectAttempts: number;
}

export interface UseSimplifiedConnectionHealthOptions {
  checkInterval?: number;
  maxReconnectAttempts?: number;
  enableAutoReconnect?: boolean;
  onStateChange?: (state: ConnectionHealthState) => void;
}

export function useSimplifiedConnectionHealth({
  checkInterval = 60000, // 60 seconds
  maxReconnectAttempts = 3,
  enableAutoReconnect = true,
  onStateChange
}: UseSimplifiedConnectionHealthOptions = {}): ConnectionHealthState & {
  reconnect: () => Promise<void>;
  resetErrors: () => void;
} {
  // State management
  const [state, setState] = useState<ConnectionHealthState>({
    status: connectionStates.CONNECTING,
    isHealthy: true,
    lastCheck: null,
    reconnectAttempts: 0
  });

  // Update state with callback
  const updateState = useCallback((updates: Partial<ConnectionHealthState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      onStateChange?.(newState);
      return newState;
    });
  }, [onStateChange]);

  // Manual reconnection
  const reconnect = useCallback(async (): Promise<void> => {
    if (!enableAutoReconnect) return;

    const currentAttempts = state.reconnectAttempts;
    
    if (currentAttempts >= maxReconnectAttempts) {
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
        lastCheck: new Date().toISOString()
      });

    } catch (error) {
      console.error('Reconnection failed:', error);
      
      // Retry if we haven't reached max attempts
      if (currentAttempts + 1 < maxReconnectAttempts) {
        // Exponential backoff
        const delay = Math.min(2000 * Math.pow(2, currentAttempts), 10000);
        setTimeout(() => reconnect(), delay);
      } else {
        updateState({ 
          status: connectionStates.DISCONNECTED,
          isHealthy: false
        });
      }
    }
  }, [enableAutoReconnect, state.reconnectAttempts, maxReconnectAttempts, updateState]);

  // Reset errors
  const resetErrors = useCallback(() => {
    updateState({ reconnectAttempts: 0 });
  }, [updateState]);

  // Use Supabase's built-in connection events instead of custom heartbeat
  useEffect(() => {
    const handleConnectionChange = (status: string, err?: any) => {
      const isConnected = status === 'SUBSCRIBED';
      
      updateState({
        status: isConnected ? connectionStates.CONNECTED : connectionStates.DISCONNECTED,
        isHealthy: isConnected,
        lastCheck: new Date().toISOString(),
        reconnectAttempts: isConnected ? 0 : state.reconnectAttempts
      });

      if (isConnected) {
        console.log('✅ [SimplifiedConnectionHealth] Connected to Supabase realtime');
      } else {
        console.log('🔄 [SimplifiedConnectionHealth] Disconnected from Supabase realtime');
      }
    };

    // Monitor a lightweight channel for connection health
    const healthChannel = supabase
      .channel('health-monitor')
      .subscribe(handleConnectionChange);

    return () => {
      healthChannel.unsubscribe();
    };
  }, [updateState, state.reconnectAttempts]);

  return {
    ...state,
    reconnect,
    resetErrors
  };
}
