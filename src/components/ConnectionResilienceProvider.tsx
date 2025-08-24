import React from 'react';

interface ConnectionResilienceProviderProps {
  children: React.ReactNode;
  supabaseClient?: any;
  config?: {
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
    enableAutoReconnect?: boolean;
    showDebugPanel?: boolean;
    alertAutoHide?: number;
  };
}

export function ConnectionResilienceProvider({ 
  children 
}: ConnectionResilienceProviderProps) {
  // 🚨 NUCLEAR OPTION: Completely disable connection health system
  // This prevents infinite loops and performance issues
  console.log('🚨 NUCLEAR: ConnectionResilienceProvider completely disabled - no effects, no state, no loops');
  
  // Simply pass through children - no monitoring, no effects, no loops
  return <>{children}</>;
}
