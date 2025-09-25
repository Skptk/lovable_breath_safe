import { useState, useEffect, useCallback } from 'react';
import { getTimeUntilNextRefresh, setRefreshLockTimestamp } from '@/utils/refreshLock';

const TOTAL_INTERVAL_SECONDS = 15 * 60; // 15 minutes

export function useRefreshCountdown() {
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number>(TOTAL_INTERVAL_SECONDS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const syncFromLock = useCallback(() => {
    const remainingMs = getTimeUntilNextRefresh();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    setTimeUntilRefresh(remainingSeconds === 0 ? TOTAL_INTERVAL_SECONDS : remainingSeconds);
    return remainingSeconds;
  }, []);

  useEffect(() => {
    syncFromLock();
    const interval = setInterval(syncFromLock, 1000);
    return () => clearInterval(interval);
  }, [syncFromLock]);

  const markRefreshStart = useCallback(() => {
    setIsRefreshing(true);
  }, []);

  const markRefreshComplete = useCallback(() => {
    setIsRefreshing(false);
    setRefreshLockTimestamp();
    syncFromLock();
  }, [syncFromLock]);

  return {
    timeUntilRefresh,
    isRefreshing,
    markRefreshStart,
    markRefreshComplete,
  };
}