import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ConnectionStatusState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  lastCheck: Date | null;
  showToast: boolean;
}

export function ConnectionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionStatusState>({
    status: 'connecting',
    lastCheck: null,
    showToast: false
  });
  
  const { toast } = useToast();
  const prevStateRef = useRef<ConnectionStatusState | null>(null);

  // Passive connection monitoring - don't force reconnection
  const checkConnection = () => {
    const now = new Date();
    
    try {
      const isConnected = supabase.realtime.isConnected();
      const isConnecting = supabase.realtime.isConnecting();
      
      let newStatus: ConnectionStatusState['status'];
      
      if (isConnected) {
        newStatus = 'connected';
      } else if (isConnecting) {
        newStatus = 'connecting';
      } else {
        newStatus = 'disconnected';
      }
      
      setConnectionState(prevState => {
        const newState = {
          ...prevState,
          status: newStatus,
          lastCheck: now,
          showToast: newStatus === 'disconnected' && prevStateRef.current?.status !== 'disconnected'
        };
        
        // Update the ref with new state
        prevStateRef.current = newState;
        
        return newState;
      });
    } catch (error) {
      console.error('❌ [ConnectionStatus] Error checking connection:', error);
      setConnectionState(prevState => {
        return {
          ...prevState,
          status: 'disconnected',
          lastCheck: now,
          showToast: true
        };
      });
    }
  };

  // Manual reconnection - let Supabase handle this automatically
  const handleReconnect = async () => {
    console.log('⚠️ [ConnectionStatus] Manual reconnection initiated');
    
    setConnectionState(prevState => ({
      ...prevState,
      status: 'reconnecting'
    }));
    
    toast({
      title: "Reconnection Initiated",
      description: "Attempting to restore connection...",
      duration: 3000,
    });
    
    // Reset status after a delay
    setTimeout(() => {
      checkConnection();
    }, 2000);
  };

  // Monitor connection status passively
  useEffect(() => {
    // Initial check
    checkConnection();
    
    // Set up periodic checks every 5 seconds
    const interval = setInterval(checkConnection, 5000);
    
    // Listen for realtime connection changes
    const handleRealtimeStatusChange = () => {
      checkConnection();
    };

    // Add event listener for realtime status changes
    if (typeof window !== 'undefined') {
      window.addEventListener('realtime-status-change', handleRealtimeStatusChange);
    }
    
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('realtime-status-change', handleRealtimeStatusChange);
      }
    };
  }, []);

  // Show toast notification for connection issues
  useEffect(() => {
    if (connectionState.showToast && connectionState.status === 'disconnected') {
      toast({
        title: "Live Updates Unavailable",
        description: "Your app is using cached data. Live updates will resume when connection is restored automatically.",
        duration: 8000,
      });
      
      setConnectionState(prevState => ({
        ...prevState,
        showToast: false
      }));
    }
  }, [connectionState.showToast, connectionState.status, toast]);

  // Initialize prevStateRef on mount
  useEffect(() => {
    prevStateRef.current = connectionState;
  }, [connectionState]);

  // Don't show anything if connected
  if (connectionState.status === 'connected') return null;

  // Get status-specific styling and content
  const getStatusContent = () => {
    switch (connectionState.status) {
      case 'connecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: "Connecting to live updates...",
          bgColor: "bg-blue-100 border-blue-400 text-blue-700",
          darkBgColor: "dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300"
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: "Reconnecting...",
          bgColor: "bg-yellow-100 border-yellow-400 text-yellow-700",
          darkBgColor: "dark:bg-yellow-900/20 dark:border-blue-500 dark:text-blue-300"
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: "Live updates unavailable - using cached data",
          bgColor: "bg-yellow-100 border-yellow-400 text-yellow-700",
          darkBgColor: "dark:bg-yellow-900/20 dark:border-yellow-500 dark:text-yellow-300"
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: "Connection status unknown",
          bgColor: "bg-gray-100 border-gray-400 text-gray-700",
          darkBgColor: "dark:bg-gray-900/20 dark:border-gray-500 dark:text-gray-300"
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className={`fixed top-4 right-4 z-50 border rounded-lg px-4 py-3 shadow-lg transition-all duration-300 ease-in-out ${
      connectionState.status === 'connected' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
    }`}>
      <div className={`flex items-center space-x-3 ${statusContent.bgColor} ${statusContent.darkBgColor} border rounded-lg px-4 py-3`}>
        {statusContent.icon}
        <span className="text-sm font-medium">{statusContent.text}</span>
        
        {connectionState.status === 'disconnected' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            className="ml-2 h-7 px-2 text-xs border-current text-current hover:bg-current hover:text-white transition-colors"
          >
            Retry
          </Button>
        )}
      </div>
      
      {/* Connection info */}
      {connectionState.lastCheck && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Last checked: {connectionState.lastCheck.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
