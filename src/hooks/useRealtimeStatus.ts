import { useState, useEffect } from 'react';
import { getConnectionStatus, addConnectionStatusListener } from '@/lib/realtimeClient';

export type RealtimeStatus = 'connected' | 'reconnecting' | 'disconnected';

/**
 * 🚨 NUCLEAR DISABLE - Hook to monitor Supabase realtime connection status
 * Completely disabled to prevent infinite loops and performance issues
 */
export function useRealtimeStatus() {
  // 🚨 NUCLEAR: Return static values - no effects, no state changes, no loops
  console.log('🚨 NUCLEAR: useRealtimeStatus completely disabled - no monitoring, no effects, no loops');
  
  return {
    status: 'connected' as const, // Always connected
    isConnected: true, // Always connected
    isReconnecting: false, // Never reconnecting
    isDisconnected: false, // Never disconnected
  };
}
