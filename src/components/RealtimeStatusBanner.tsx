import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function RealtimeStatusBanner() {
  const { 
    isConnected, 
    connectionQuality, 
    reconnectAttempts, 
    isReconnecting, 
    canReconnect,
    manualReconnect 
  } = useConnectionHealth({
    checkInterval: 30000, // 30 seconds
    maxReconnectAttempts: 5,
    enableAutoReconnect: true
  });

  const [showBanner, setShowBanner] = useState(false);

  // Show banner when connection status changes
  useEffect(() => {
    if (connectionQuality === 'poor' || connectionQuality === 'disconnected' || isReconnecting) {
      setShowBanner(true);
    } else if (connectionQuality === 'excellent' || connectionQuality === 'good') {
      // Hide banner after a delay when connection is good
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionQuality, isReconnecting]);

  // Auto-hide banner after 10 seconds for disconnected state
  useEffect(() => {
    if (connectionQuality === 'disconnected' && showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [connectionQuality, showBanner]);

  const getStatusConfig = () => {
    switch (connectionQuality) {
      case 'excellent':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-500',
          text: 'Excellent Connection',
          description: 'Real-time updates are working perfectly'
        };
      case 'good':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-400',
          text: 'Good Connection',
          description: 'Real-time updates are working well'
        };
      case 'poor':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-yellow-500',
          text: 'Poor Connection',
          description: 'Real-time updates may be delayed'
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

  const handleRetry = async () => {
    if (canReconnect) {
      await manualReconnect();
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
                {isReconnecting && (
                  <Badge variant="secondary" className="text-xs">
                    Retry {reconnectAttempts}/5
                  </Badge>
                )}
                {connectionQuality === 'poor' && (
                  <Badge variant="secondary" className="text-xs bg-yellow-600">
                    Poor Quality
                  </Badge>
                )}
              </div>
              <p className="text-sm opacity-90">{statusConfig.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {(connectionQuality === 'disconnected' || connectionQuality === 'poor') && canReconnect && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRetry}
                className="text-xs h-8 px-3"
                disabled={isReconnecting}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isReconnecting ? 'animate-spin' : ''}`} />
                {isReconnecting ? 'Reconnecting...' : 'Retry'}
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
