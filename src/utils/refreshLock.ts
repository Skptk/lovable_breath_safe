export const REFRESH_LOCK_STORAGE_KEY = 'breath_safe_refresh_lock';
const STORAGE_KEY = REFRESH_LOCK_STORAGE_KEY;
export const REFRESH_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface RefreshLockPayload {
  timestamp: number;
}

const isLocalStorageAvailable = () => {
  try {
    const testKey = '__refresh_lock_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const setRefreshLockTimestamp = (timestamp: number = Date.now()): void => {
  if (!isLocalStorageAvailable()) return;
  const payload: RefreshLockPayload = { timestamp };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const getRefreshLockTimestamp = (): number | null => {
  if (!isLocalStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as RefreshLockPayload;
    if (typeof payload?.timestamp !== 'number') return null;
    return payload.timestamp;
  } catch {
    return null;
  }
};

export const clearRefreshLock = (): void => {
  if (!isLocalStorageAvailable()) return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getTimeUntilNextRefresh = (): number => {
  const timestamp = getRefreshLockTimestamp();
  if (!timestamp) return 0;
  const elapsed = Date.now() - timestamp;
  const remaining = REFRESH_LOCK_DURATION_MS - elapsed;
  return Math.max(0, remaining);
};

export const isRefreshLocked = (): boolean => getTimeUntilNextRefresh() > 0;

export default {
  REFRESH_LOCK_DURATION_MS,
  setRefreshLockTimestamp,
  getRefreshLockTimestamp,
  getTimeUntilNextRefresh,
  clearRefreshLock,
  isRefreshLocked,
};
