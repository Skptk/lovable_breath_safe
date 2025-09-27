import { useEffect, useState } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  since: number;
}

const getInitialStatus = (): NetworkStatus => {
  if (typeof navigator === 'undefined') {
    return { isOnline: true, since: Date.now() };
  }

  return {
    isOnline: navigator.onLine,
    since: Date.now()
  };
};

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>(getInitialStatus);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handleOnline = () => {
      setStatus({ isOnline: true, since: Date.now() });
    };

    const handleOffline = () => {
      setStatus({ isOnline: false, since: Date.now() });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
};
