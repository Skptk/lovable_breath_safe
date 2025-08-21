import { useState, useEffect, useCallback } from 'react';

export function useRefreshCountdown() {
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number>(900); // 15 minutes in seconds
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1) {
          // Auto refresh when countdown reaches 0
          return 900; // Reset to 15 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeUntilRefresh(900); // Reset countdown
    
    // Simulate refresh duration
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  }, []);

  return {
    timeUntilRefresh,
    isRefreshing,
    manualRefresh
  };
}