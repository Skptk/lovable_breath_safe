import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function RealtimeStatusBanner() {
  const { 
    connectionState, 
    connectionQuality, 
    attemptReconnect 
  } = useConnectionHealth();

  const [showBanner, setShowBanner] = useState(false);

  // Show banner when connection status changes
  useEffect(() => {
    if (connectionState.status === 'disconnected' || connectionState.status === 'error') {
      setShowBanner(true);
    } else if (connectionState.status === 'connected' && connectionState.isHealthy) {
      // Hide banner after a delay when connection is good
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionState.status, connectionState.isHealthy]);

  // Auto-hide banner after 10 seconds for disconnected state
  useEffect(() => {
    if (connectionState.status === 'disconnected' && showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [connectionState.status, showBanner]);

  const getStatusConfig = () => {
    switch (connectionState.status) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-500',
          text: 'Connected',
          description: 'Real-time updates are working'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          color: 'bg-blue-500',
          text: 'Connecting',
          description: 'Establishing connection...'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'bg-red-500',
          text: 'Disconnected',
          description: 'Real-time updates unavailable'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-red-500',
          text: 'Connection Error',
          description: 'Failed to establish connection'
        };
      default:
        return {
          icon: <Wifi className="h-4 w-4" />,
          color: 'bg-gray-500',
          text: 'Unknown',
          description: 'Connection status unknown'
        };
    }
  };

  const statusConfig = getStatusConfig();

  const handleRetry = async () => {
    try {
      await attemptReconnect();
    } catch (error) {
      console.error('Manual reconnection failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 ${statusConfig.color} text-white shadow-lg`}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {statusConfig.icon}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{statusConfig.text}</span>
                {connectionState.status === 'connecting' && (
                  <Badge variant="secondary" className="text-xs">
                    Connecting...
                  </Badge>
                )}
                {connectionState.status === 'disconnected' && (
                  <Badge variant="secondary" className="text-xs bg-red-600">
                    Offline
                  </Badge>
                )}
              </div>
              <p className="text-sm opacity-90">{statusConfig.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {(connectionState.status === 'disconnected' || connectionState.status === 'error') && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRetry}
                className="text-xs h-8 px-3"
                disabled={connectionState.status === 'connecting'}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${connectionState.status === 'connecting' ? 'animate-spin' : ''}`} />
                {connectionState.status === 'connecting' ? 'Connecting...' : 'Retry'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-white hover:bg-white/20 text-xs h-8 px-2"
            >
              ×
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
