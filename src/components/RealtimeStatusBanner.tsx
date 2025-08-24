import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function RealtimeStatusBanner() {
  const { connectionStatus, isConnected } = useRealtime();
  const [showBanner, setShowBanner] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Show banner when connection status changes
  useEffect(() => {
    if (connectionStatus === 'reconnecting' || connectionStatus === 'disconnected') {
      setShowBanner(true);
      if (connectionStatus === 'reconnecting') {
        setRetryCount(prev => prev + 1);
      }
    } else if (connectionStatus === 'connected') {
      // Hide banner after a delay when connected
      const timer = setTimeout(() => {
        setShowBanner(false);
        setRetryCount(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  // Auto-hide banner after 10 seconds for disconnected state
  useEffect(() => {
    if (connectionStatus === 'disconnected' && showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, showBanner]);

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-500',
          text: 'Connected',
          description: 'Real-time updates are working'
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          color: 'bg-yellow-500',
          text: 'Reconnecting',
          description: `Attempting to reconnect... (${retryCount}/3)`
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'bg-red-500',
          text: 'Disconnected',
          description: 'Real-time updates are unavailable'
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

  const handleRetry = () => {
    // Trigger a manual reconnection attempt
    window.location.reload();
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
                {connectionStatus === 'reconnecting' && (
                  <Badge variant="secondary" className="text-xs">
                    Retry {retryCount}/3
                  </Badge>
                )}
              </div>
              <p className="text-sm opacity-90">{statusConfig.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {connectionStatus === 'disconnected' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRetry}
                className="text-xs h-8 px-3"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
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
