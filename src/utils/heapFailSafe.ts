import type { QueryClient } from '@tanstack/react-query';
import { memoryMonitor } from './memoryMonitor';

const MB = 1024 * 1024;

export type HeapFailSafeLevel = 'warn' | 'critical' | 'emergency';

export interface HeapFailSafeEventDetail {
  level: HeapFailSafeLevel;
  usedMb: number;
  timestamp: number;
}

export type HeapFailSafeListener = (event: HeapFailSafeEventDetail) => void;

export interface HeapFailSafeOptions {
  queryClient?: QueryClient;
  warnThresholdMb?: number;
  criticalThresholdMb?: number;
  emergencyThresholdMb?: number;
  onWarn?: (usedMb: number) => void;
  onCritical?: (usedMb: number) => void;
  onEmergency?: (usedMb: number) => void;
}

// Thresholds are now passed via options

const DISPATCH_EVENT_NAME = 'heap-failsafe';

const dispatchHeapEvent = (level: HeapFailSafeLevel, detail: { usedMb: number }) => {
  if (typeof window === 'undefined') return;
  const eventDetail: HeapFailSafeEventDetail = {
    level,
    usedMb: detail.usedMb,
    timestamp: Date.now()
  };
  window.dispatchEvent(new CustomEvent<HeapFailSafeEventDetail>(DISPATCH_EVENT_NAME, { detail: eventDetail }));
};

const readMemoryDiagnostics = () => {
  try {
    const stats = (memoryMonitor as any)?.getStats?.();
    if (!stats) {
      return undefined;
    }
    return {
      highWaterMark: stats.highWaterMark,
      listeners: stats.listeners,
      historyLength: stats.history?.length,
      recentUsage: stats.current,
    };
  } catch (error) {
    console.warn('[HeapFailSafe] Failed to read memory diagnostics', error);
    return undefined;
  }
};

const trimQueryCache = async (queryClient: QueryClient, clearAll: boolean) => {
  if (!queryClient) {
    return;
  }

  try {
    if (clearAll) {
      queryClient.clear();
      return;
    }

    const queries = queryClient.getQueryCache().getAll();
    
    // More aggressive: remove 50% of inactive queries
    const targets = queries
      .filter(query => !query.isActive())
      .sort((a, b) => (a.state.dataUpdatedAt ?? 0) - (b.state.dataUpdatedAt ?? 0))
      .slice(0, Math.max(5, Math.ceil(queries.length * 0.5))); // Increased from 0.1 to 0.5

    for (const query of targets) {
      queryClient.getQueryCache().remove(query);
    }
    
    // Also trim large arrays in remaining queries
    for (const query of queries) {
      const data = query.state.data;
      if (Array.isArray(data) && data.length > 20) {
        query.setState({
          data: data.slice(0, 20),
          dataUpdatedAt: Date.now(),
        });
      }
    }
  } catch (error) {
    console.warn('[HeapFailSafe] Failed to trim query cache', error);
  }
};

const trimSessionStorage = (clearAll: boolean) => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    if (clearAll) {
      sessionStorage.clear();
      return;
    }

    const keys = Object.keys(sessionStorage);
    const targetCount = Math.max(3, Math.ceil(keys.length * 0.3));
    let removed = 0;

    for (const key of keys) {
      sessionStorage.removeItem(key);
      removed += 1;
      if (removed >= targetCount) {
        break;
      }
    }
  } catch (error) {
    console.warn('[HeapFailSafe] Failed to trim session storage', error);
  }
};

export const initHeapFailSafe = (options: HeapFailSafeOptions = {}) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const {
    queryClient,
    warnThresholdMb = 60, // Lowered from 70
    criticalThresholdMb = 100, // Keep at 100
    emergencyThresholdMb = 140, // Lowered from 200
    onWarn,
    onCritical,
    onEmergency
  } = options;

  let lastWarned = 0;
  let lastCritical = 0;
  let lastEmergency = 0;
  const throttleMs = 5_000; // Reduced from 15s to 5s for faster response

  return memoryMonitor.addListener(usage => {
    const usedMb = usage.used / MB;
    const now = Date.now();

    if (usedMb >= emergencyThresholdMb) {
      if (now - lastEmergency >= throttleMs) {
        lastEmergency = now;
        console.error('🚨 [HeapFailSafe] Emergency threshold exceeded. Reloading application.', {
          usedMb,
          diagnostics: readMemoryDiagnostics(),
        });
        onEmergency?.(usedMb);
        dispatchHeapEvent('emergency', { usedMb });
        
        // Dynamic import for emergency cleanup - ensures cleanup works even in degraded state
        // Note: Vite warning about dynamic/static import conflict is expected here since
        // memoryBudgetManager is also statically imported in main.tsx. The dynamic import
        // provides a defensive fallback for emergency scenarios.
        import('./memoryBudgetManager').then(({ memoryBudgetManager }) => {
          memoryBudgetManager.emergencyCleanup('HeapFailSafe emergency');
        });
        
        // Reload after cleanup attempt
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
      return;
    }

    if (usedMb >= criticalThresholdMb) {
      if (now - lastCritical >= throttleMs) {
        lastCritical = now;
        console.error('⚠️ [HeapFailSafe] Critical heap usage detected. Clearing caches.', {
          usedMb,
          diagnostics: readMemoryDiagnostics(),
        });
        
        // Dynamic import for critical cleanup - defensive fallback mechanism
        // Note: Vite warning about dynamic/static import conflict is expected here.
        import('./memoryBudgetManager').then(({ memoryBudgetManager }) => {
          memoryBudgetManager.performCleanup('HeapFailSafe critical');
        });
        
        void trimQueryCache(queryClient!, true); // More aggressive
        trimSessionStorage(true); // More aggressive
        onCritical?.(usedMb);
        dispatchHeapEvent('critical', { usedMb });
      }
      return;
    }

    if (usedMb >= warnThresholdMb && now - lastWarned >= throttleMs) {
      lastWarned = now;
      console.warn('🟡 [HeapFailSafe] High heap usage detected. Monitoring closely.', {
        usedMb,
        diagnostics: readMemoryDiagnostics(),
      });
      
      // Dynamic import for proactive cleanup - defensive fallback mechanism
      // Note: Vite warning about dynamic/static import conflict is expected here.
      import('./memoryBudgetManager').then(({ memoryBudgetManager }) => {
        memoryBudgetManager.performCleanup('HeapFailSafe warning');
      });
      
      onWarn?.(usedMb);
      dispatchHeapEvent('warn', { usedMb });
    }
  });
};

export const addHeapFailSafeListener = (listener: HeapFailSafeListener) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Error handler for suppressing heap-related errors
  const handleError = (_event: ErrorEvent) => {
    // Suppress heap-related errors
    return true;
  };

  window.addEventListener('error', handleError);

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<HeapFailSafeEventDetail>;
    if (!customEvent.detail) {
      return;
    }
    listener(customEvent.detail);
  };

  window.addEventListener(DISPATCH_EVENT_NAME, handler as EventListener);

  return () => {
    window.removeEventListener(DISPATCH_EVENT_NAME, handler as EventListener);
    window.removeEventListener('error', handleError);
  };
};
