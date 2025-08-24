import React from 'react';
import { CheckCircle, RefreshCw, WifiOff, Info } from 'lucide-react';
import { Button } from './ui/button';

interface ConnectionNotificationProps {
  notification: {
    id: string;
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
    priority: 'normal' | 'high' | 'low';
    timestamp: number;
  };
  onClose: () => void;
}

// User-friendly notification messages
const getNotificationMessage = (status: string, technical = false) => {
  if (technical && process.env.NODE_ENV === 'development') {
    return technical; // Show technical details in development
  }

  switch (status) {
    case 'connected':
      return 'You\'re back online';
    case 'disconnected':
      return 'Checking connection...';
    case 'reconnecting':
      return 'Reconnecting...';
    default:
      return 'Connecting...';
  }
};

// Get notification icon
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4" />;
    case 'error':
      return <RefreshCw className="w-4 h-4" />;
    case 'warning':
      return <Info className="w-4 h-4" />;
    case 'info':
      return <Info className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

// Get notification styling
const getNotificationStyling = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
    case 'error':
      return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    case 'info':
      return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
    default:
      return 'bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-400';
  }
};

export default function ConnectionNotification({ notification, onClose }: ConnectionNotificationProps) {
  const message = getNotificationMessage(notification.message, false);
  const icon = getNotificationIcon(notification.type);
  const styling = getNotificationStyling(notification.type);

  return (
    <div className={`notification notification-${notification.type} border rounded-lg p-3 backdrop-blur-sm ${styling}`}>
      <div className="notification-content flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="notification-icon">
            {icon}
          </span>
          <span className="notification-message text-sm font-medium">
            {message}
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="notification-close text-lg hover:opacity-70 transition-opacity"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
