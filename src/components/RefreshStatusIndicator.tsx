import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, CheckCircle } from 'lucide-react';

interface RefreshStatusIndicatorProps {
  type: 'air-quality' | 'weather' | 'background';
}

const REFRESH_LOCK_KEYS = {
  'air-quality': 'breath_safe_refresh_lock',
  'weather': 'breath_safe_weather_refresh_lock',
  'background': 'breath_safe_background_refresh_lock'
};

const REFRESH_LOCK_DURATION = 14 * 60 * 1000; // 14 minutes

export default function RefreshStatusIndicator({ type }: RefreshStatusIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    const checkRefreshLock = () => {
      try {
        const lockKey = REFRESH_LOCK_KEYS[type];
        const lockData = localStorage.getItem(lockKey);
        
        if (!lockData) {
          setIsLocked(false);
          setTimeRemaining(0);
          return;
        }

        const { timestamp } = JSON.parse(lockData);
        const now = Date.now();
        const timeSinceLastRefresh = now - timestamp;
        const remaining = Math.max(0, REFRESH_LOCK_DURATION - timeSinceLastRefresh);

        setIsLocked(remaining > 0);
        setTimeRemaining(remaining);
      } catch {
        setIsLocked(false);
        setTimeRemaining(0);
      }
    };

    // Check immediately
    checkRefreshLock();

    // Check every second
    const interval = setInterval(checkRefreshLock, 1000);

    return () => clearInterval(interval);
  }, [type]);

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return '0:00';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTypeLabel = (): string => {
    switch (type) {
      case 'air-quality': return 'Air Quality';
      case 'weather': return 'Weather';
      case 'background': return 'Background';
      default: return 'Data';
    }
  };

  if (!isLocked) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>{getTypeLabel()} data ready for refresh</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-amber-600 text-sm">
      <Clock className="w-4 h-4" />
      <span>{getTypeLabel()} refreshes in {formatTimeRemaining(timeRemaining)}</span>
    </div>
  );
}
