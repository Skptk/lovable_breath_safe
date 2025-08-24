import { useState, useEffect, useCallback } from 'react';

// Refresh lock mechanism constants (must match useAirQuality)
const REFRESH_LOCK_KEY = 'breath_safe_refresh_lock';
const REFRESH_LOCK_DURATION = 14 * 60 * 1000; // 14 minutes

export function useRefreshCountdown() {
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number>(900); // 15 minutes in seconds
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to get time until next refresh based on refresh lock
  const getTimeUntilRefresh = useCallback((): number => {
    try {
      const lockData = localStorage.getItem(REFRESH_LOCK_KEY);
      if (!lockData) return 0; // No lock, can refresh immediately
      
      const { timestamp } = JSON.parse(lockData);
      const now = Date.now();
      const timeSinceLastRefresh = now - timestamp;
      const timeRemaining = REFRESH_LOCK_DURATION - timeSinceLastRefresh;
      
      // Convert to seconds and ensure it's positive
      return Math.max(0, Math.floor(timeRemaining / 1000));
    } catch {
      return 0;
    }
  }, []);

  // Countdown timer that syncs with refresh lock
  useEffect(() => {
    const updateCountdown = () => {
      const timeRemaining = getTimeUntilRefresh();
      setTimeUntilRefresh(timeRemaining);
      
      // If refresh lock has expired, reset countdown
      if (timeRemaining <= 0) {
        setTimeUntilRefresh(900); // Reset to 15 minutes
      }
    };

    // Update immediately
    updateCountdown();
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [getTimeUntilRefresh]);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Simulate refresh duration
    setTimeout(() => {
      setIsRefreshing(false);
      // The countdown will automatically update based on the new refresh lock
    }, 2000);
  }, []);

  return {
    timeUntilRefresh,
    isRefreshing,
    manualRefresh
  };
}