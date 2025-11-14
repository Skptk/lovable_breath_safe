/**
 * Memory Budget Manager - Valve-style aggressive memory management
 * 
 * Tracks memory usage across subsystems and enforces strict budgets.
 * Automatically triggers cleanup when thresholds are exceeded.
 */

import type { QueryClient, Query } from '@tanstack/react-query';
import { useAppStore } from '@/store';
import { useWeatherStore } from '@/store/weatherStore';

const MB = 1024 * 1024;

export interface MemoryBudget {
  maxHeapMB: number;
  warnThresholdMB: number;
  criticalThresholdMB: number;
  emergencyThresholdMB: number;
}

export interface SubsystemBudget {
  name: string;
  maxQueries?: number;
  maxDataSize?: number;
  maxCacheEntries?: number;
}

const DEFAULT_BUDGET: MemoryBudget = {
  maxHeapMB: 150, // Hard limit - app should never exceed this
  warnThresholdMB: 80, // Start aggressive cleanup
  criticalThresholdMB: 120, // Emergency cleanup
  emergencyThresholdMB: 140, // Force page reload
};

const SUBSYSTEM_BUDGETS: Record<string, SubsystemBudget> = {
  'react-query': {
    name: 'React Query',
    maxQueries: 10, // Maximum number of cached queries
    maxDataSize: 30, // Maximum items in array results
  },
  'zustand-cache': {
    name: 'Zustand Cache',
    maxCacheEntries: 20, // Maximum LRU cache entries
  },
  'background-images': {
    name: 'Background Images',
    maxCacheEntries: 2, // Only keep 2 images in memory
  },
};

class MemoryBudgetManager {
  private queryClient: QueryClient | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private lastCleanupTime = 0;
  private cleanupThrottleMs = 5000; // Don't cleanup more than once per 5 seconds
  private isTabVisible = true;

  constructor() {
    if (typeof window !== 'undefined') {
      // Track tab visibility
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        if (document.hidden) {
          this.emergencyCleanup('Tab hidden');
        }
      });

      // Periodic aggressive cleanup
      this.startPeriodicCleanup();
    }
  }

  setQueryClient(client: QueryClient) {
    this.queryClient = client;
  }

  private startPeriodicCleanup() {
    // Cleanup every 30 seconds
    if (typeof window !== 'undefined') {
      this.cleanupInterval = window.setInterval(() => {
        if (this.isTabVisible) {
          this.performCleanup('Periodic');
        }
      }, 30000) as unknown as ReturnType<typeof setInterval>;
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): number | null {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return null;
    }
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize / MB;
  }

  /**
   * Check if we're over budget and trigger cleanup if needed
   */
  checkBudget(): 'ok' | 'warn' | 'critical' | 'emergency' {
    const usage = this.getCurrentMemoryUsage();
    if (!usage) return 'ok';

    if (usage >= DEFAULT_BUDGET.emergencyThresholdMB) {
      this.emergencyCleanup('Emergency threshold exceeded');
      return 'emergency';
    }

    if (usage >= DEFAULT_BUDGET.criticalThresholdMB) {
      this.emergencyCleanup('Critical threshold exceeded');
      return 'critical';
    }

    if (usage >= DEFAULT_BUDGET.warnThresholdMB) {
      this.performCleanup('Warning threshold exceeded');
      return 'warn';
    }

    return 'ok';
  }

  /**
   * Perform aggressive cleanup of all subsystems
   */
  performCleanup(reason: string) {
    const now = Date.now();
    if (now - this.lastCleanupTime < this.cleanupThrottleMs) {
      return; // Throttle cleanup
    }
    this.lastCleanupTime = now;

    console.log(`🧹 [MemoryBudget] Cleanup triggered: ${reason}`);

    // Cleanup React Query
    this.cleanupReactQuery();

    // Cleanup Zustand stores
    this.cleanupZustandStores();

    // Force garbage collection hint
    this.forceGC();
  }

  /**
   * Emergency cleanup - most aggressive
   */
  emergencyCleanup(reason: string) {
    console.error(`🚨 [MemoryBudget] EMERGENCY CLEANUP: ${reason}`);

    // Clear ALL React Query cache
    if (this.queryClient) {
      this.queryClient.clear();
    }

    // Clear Zustand stores
    this.cleanupZustandStores(true);

    // Clear session storage
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch (_e) {
        // Ignore
      }
    }

    // Force GC
    this.forceGC();

    // If still over emergency threshold, reload
    setTimeout(() => {
      const usage = this.getCurrentMemoryUsage();
      if (usage && usage >= DEFAULT_BUDGET.emergencyThresholdMB) {
        console.error('🚨 [MemoryBudget] Emergency threshold still exceeded, reloading...');
        window.location.reload();
      }
    }, 1000);
  }

  /**
   * Cleanup React Query cache
   */
  private cleanupReactQuery(): void {
    if (!this.queryClient) return;

    const budget = SUBSYSTEM_BUDGETS['react-query'] as SubsystemBudget | undefined;
    if (!budget) {
      console.warn('No budget defined for react-query');
      return;
    }

    const queryCache = this.queryClient.getQueryCache();
    const allQueries = queryCache.getAll();
    const maxDataSize = budget.maxDataSize ?? 30;
    const maxQueries = budget.maxQueries ?? 10;

    // Trim large arrays first
    allQueries.forEach((query: Query) => {
      const { data } = query.state;
      if (Array.isArray(data) && data.length > maxDataSize) {
        query.setState({
          data: data.slice(0, maxDataSize),
          dataUpdatedAt: Date.now(),
        });
      }
    });

    // Remove inactive queries if over limit
    if (allQueries.length > maxQueries) {
      const inactiveQueries = allQueries
        .filter((q: Query) => !q.isActive())
        .sort((a: Query, b: Query) => (a.state.dataUpdatedAt ?? 0) - (b.state.dataUpdatedAt ?? 0))
        .slice(0, allQueries.length - maxQueries);

      inactiveQueries.forEach((query: Query) => {
        queryCache.remove(query);
      });

      if (process.env['NODE_ENV'] !== 'production') {
        console.log(
          `🧹 [MemoryBudget] Removed ${inactiveQueries.length} inactive queries, kept ${maxQueries} active`
        );
      }
    }
  }

  /**
   * Cleanup Zustand stores
   */
  private cleanupZustandStores(aggressive = false) {
    // Clear app store cache
    try {
      const store = useAppStore.getState();
      if (store.clearExpiredCache) {
        store.clearExpiredCache();
      }
      if (aggressive && store.cache) {
        store.cache.clear();
      }
    } catch (_e) {
      // Store might not be available
    }

    // Clear weather store cache
    try {
      const store = useWeatherStore.getState();
      if (aggressive) {
        store.clearCache();
      }
    } catch (_e) {
      // Store might not be available
    }
  }

  /**
   * Force garbage collection hint
   */
  private forceGC() {
    // Request garbage collection if available (Chrome DevTools)
    if ((window as any).gc) {
      (window as any).gc();
    }

    // Create and immediately release large objects to encourage GC
    if (typeof ArrayBuffer !== 'undefined') {
      const temp = new ArrayBuffer(1024 * 1024); // 1MB
      // Immediately dereference
      void temp;
    }
  }

  /**
   * Stop all polling queries when tab is hidden
   */
  pauseAllPolling() {
    if (!this.queryClient) return;

    const allQueries = this.queryClient.getQueryCache().getAll();
    for (const query of allQueries) {
      // Cancel any pending refetches
      if (query.state.fetchStatus === 'fetching') {
        query.cancel();
      }
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const memoryBudgetManager = new MemoryBudgetManager();

// Auto-check budget every 10 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    memoryBudgetManager.checkBudget();
  }, 10000);
}

