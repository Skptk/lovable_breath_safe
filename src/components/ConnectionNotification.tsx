import React, { useState, useEffect, useCallback } from 'react';
import { X, Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';

export interface ConnectionNotificationProps {
  status: ConnectionStatus;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  dismissDelay?: number;
}

export const ConnectionNotification: React.FC<ConnectionNotificationProps> = ({
  status,
  message,
  onRetry,
  onDismiss,
  autoDismiss = true,
  dismissDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  // Auto-dismiss logic - only for successful connections
  useEffect(() => {
    if (autoDismiss && status === 'connected') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, dismissDelay);

      return () => clearTimeout(timer);
    }
  }, [status, autoDismiss, dismissDelay]);

  // Prevent showing multiple notifications for the same status
  useEffect(() => {
    // Reset visibility when status changes
    setIsVisible(true);
    setIsDismissing(false);
  }, [status]);

  const handleDismiss = useCallback(() => {
    setIsDismissing(true);
    setTimeout(() => {
      setIsVisible(false);
      // Delay the onDismiss callback to prevent immediate retriggering
      setTimeout(() => {
        onDismiss?.();
      }, 100);
    }, 300); // Smooth fade out
  }, [onDismiss]);

  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  if (!isVisible) return null;

  // Get status-specific styling and content
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          bgColor: 'bg-green-500/10 border-green-500/20',
          textColor: 'text-green-700 dark:text-green-300',
          borderColor: 'border-green-500/20',
          title: 'Connected',
          defaultMessage: 'Real-time updates are now available'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />,
          bgColor: 'bg-blue-500/10 border-blue-500/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          borderColor: 'border-blue-500/20',
          title: 'Connecting',
          defaultMessage: 'Establishing connection...'
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />,
          bgColor: 'bg-yellow-500/10 border-yellow-500/20',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          borderColor: 'border-yellow-500/20',
          title: 'Reconnecting',
          defaultMessage: 'Attempting to restore connection...'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-5 w-5 text-red-500" />,
          bgColor: 'bg-red-500/10 border-red-500/20',
          textColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-500/20',
          title: 'Disconnected',
          defaultMessage: 'Real-time updates unavailable'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          bgColor: 'bg-red-500/10 border-red-500/20',
          textColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-500/20',
          title: 'Connection Error',
          defaultMessage: 'Failed to establish connection'
        };
      default:
        return {
          icon: <Wifi className="h-5 w-5 text-gray-500" />,
          bgColor: 'bg-gray-500/10 border-gray-500/20',
          textColor: 'text-gray-700 dark:text-gray-300',
          borderColor: 'border-gray-500/20',
          title: 'Unknown Status',
          defaultMessage: 'Connection status unknown'
        };
    }
  };

  const config = getStatusConfig();
  const displayMessage = message || config.defaultMessage;

  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
        'w-full max-w-md mx-4',
        'transition-all duration-300 ease-out',
        isDismissing ? 'opacity-0 translate-y-[-100%]' : 'opacity-100 translate-y-0'
      )}
    >
      <div
        className={cn(
          'floating-card border-2',
          config.bgColor,
          config.borderColor,
          'p-4 shadow-lg'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {config.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className={cn('text-sm font-semibold', config.textColor)}>
                {config.title}
              </h3>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className={cn('text-sm', config.textColor)}>
              {displayMessage}
            </p>
            
            {/* Action buttons for specific statuses */}
            {(status === 'disconnected' || status === 'error') && onRetry && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleRetry}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 h-7"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionNotification;
