import { useState, useEffect } from 'react';

interface UseRefreshCountdownOptions {
  intervalMs: number; // Refresh interval in milliseconds
  enabled: boolean; // Whether auto-refresh is enabled
  lastRefreshTime?: string; // ISO string of last refresh
}

export function useRefreshCountdown({ intervalMs, enabled, lastRefreshTime }: UseRefreshCountdownOptions) {
  const [timeUntilNextRefresh, setTimeUntilNextRefresh] = useState<number>(0);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !lastRefreshTime) {
      setTimeUntilNextRefresh(0);
      setNextRefreshTime(null);
      return;
    }

    const lastRefresh = new Date(lastRefreshTime);
    const nextRefresh = new Date(lastRefresh.getTime() + intervalMs);
    setNextRefreshTime(nextRefresh);

    const updateCountdown = () => {
      const now = new Date();
      const timeLeft = Math.max(0, nextRefresh.getTime() - now.getTime());
      setTimeUntilNextRefresh(timeLeft);

      if (timeLeft === 0) {
        // Reset for next interval
        const newNextRefresh = new Date(now.getTime() + intervalMs);
        setNextRefreshTime(newNextRefresh);
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [enabled, lastRefreshTime, intervalMs]);

  const formatTimeLeft = (ms: number): string => {
    if (ms === 0) return 'Refreshing...';
    
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getProgressPercentage = (): number => {
    if (!enabled || !lastRefreshTime || !nextRefreshTime) return 0;
    
    const lastRefresh = new Date(lastRefreshTime);
    const now = new Date();
    const elapsed = now.getTime() - lastRefresh.getTime();
    const progress = (elapsed / intervalMs) * 100;
    
    return Math.min(progress, 100);
  };

  return {
    timeUntilNextRefresh,
    nextRefreshTime,
    formatTimeLeft,
    getProgressPercentage,
    isRefreshing: timeUntilNextRefresh === 0 && enabled
  };
}
