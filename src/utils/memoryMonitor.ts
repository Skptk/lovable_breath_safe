import { createSafeInterval, CancelSafeInterval } from './safeTimers';

interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
  percentUsed: number;
  timestamp: number;
}

// Use standard types from lib.dom.d.ts
type RequestIdleCallback = (
  callback: (deadline: IdleDeadline) => void, 
  options?: IdleRequestOptions
) => number;

type CancelIdleCallback = (handle: number) => void;

const hasWindow = typeof window !== 'undefined';
const hasIdleCallback = hasWindow && typeof (window as unknown as { requestIdleCallback?: RequestIdleCallback }).requestIdleCallback === 'function';
const requestIdle: RequestIdleCallback | null = hasIdleCallback
  ? (window as unknown as { requestIdleCallback: RequestIdleCallback }).requestIdleCallback
  : null;
const cancelIdle: CancelIdleCallback | null = hasIdleCallback
  ? (window as unknown as { cancelIdleCallback: CancelIdleCallback }).cancelIdleCallback
  : null;

const MIN_INTERVAL_MS = 15_000;
const MAX_INTERVAL_MS = 60_000;
const HIGH_USAGE_THRESHOLD = 0.7;
const LOW_USAGE_THRESHOLD = 0.45;
const LISTENER_THROTTLE_MS = 2_000;
const HISTORY_LIMIT = 60;
const MAX_POOL_SIZE = 32;

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private highWaterMark = 0;
  private checkInterval: CancelSafeInterval | null = null;
  private listeners: Array<(usage: MemoryUsage) => void> = [];
  private history: MemoryUsage[] = [];
  private usagePool: MemoryUsage[] = [];
  private observeIntervalMs = 30_000;
  private pendingIdleHandle: number | null = null;
  private notifyScheduled = false;
  private pendingUsage: MemoryUsage | null = null;
  private lastDispatchTs = 0;

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  private getMemoryUsage(): MemoryUsage | null {
    if (typeof window === 'undefined') return null; // Skip in SSR
    
    const performance = window.performance as any;
    if (!performance?.memory) return null;

    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;

    const usage = this.usagePool.pop() ?? { used: 0, total: 0, limit: 0, percentUsed: 0, timestamp: 0 };
    usage.used = usedJSHeapSize;
    usage.total = totalJSHeapSize;
    usage.limit = jsHeapSizeLimit;
    usage.percentUsed = (usedJSHeapSize / jsHeapSizeLimit) * 100;
    usage.timestamp = Date.now();

    return usage;
  }

  private checkMemory() {
    const memory = this.getMemoryUsage();
    if (!memory) return;

    // Update high water mark
    this.highWaterMark = Math.max(this.highWaterMark, memory.used);
    
    // Add to history
    this.history.push(memory);
    if (this.history.length > HISTORY_LIMIT) {
      const removed = this.history.shift();
      if (removed && this.usagePool.length < MAX_POOL_SIZE) {
        this.usagePool.push(removed);
      }
    }

    // Notify listeners
    this.queueListenerNotification(memory);

    // Log warning if memory usage is high
    if (memory.percentUsed > 80) {
      console.warn(`High memory usage: ${this.formatMemory(memory.used)} / ${this.formatMemory(memory.total)} (${memory.percentUsed.toFixed(1)}%)`);
      
      // Trigger garbage collection if available
      if (window.gc) {
        console.log('Triggering garbage collection...');
        window.gc();
      }
    }

    if (memory.percentUsed > HIGH_USAGE_THRESHOLD * 100 && this.observeIntervalMs !== MIN_INTERVAL_MS) {
      this.startMonitoring(Math.max(MIN_INTERVAL_MS, Math.floor(this.observeIntervalMs * 0.75)));
    } else if (memory.percentUsed < LOW_USAGE_THRESHOLD * 100 && this.observeIntervalMs !== MAX_INTERVAL_MS) {
      this.startMonitoring(Math.min(MAX_INTERVAL_MS, Math.floor(this.observeIntervalMs * 1.25)));
    }
  }

  private flushNotifications() {
    this.notifyScheduled = false;
    this.pendingIdleHandle = null;
    if (!this.pendingUsage) {
      return;
    }

    const snapshot = this.pendingUsage;
    this.pendingUsage = null;
    this.lastDispatchTs = Date.now();

    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('Error in memory monitor listener:', error);
      }
    }
  }

  private queueListenerNotification(memory: MemoryUsage) {
    this.pendingUsage = memory;
    if (this.notifyScheduled) {
      return;
    }

    const scheduleFlush = (delay: number) => {
      if (delay > 0) {
        setTimeout(() => this.flushNotifications(), delay);
        return;
      }

      if (requestIdle) {
        this.pendingIdleHandle = requestIdle(() => this.flushNotifications(), { timeout: LISTENER_THROTTLE_MS });
      } else {
        setTimeout(() => this.flushNotifications(), 0);
      }
    };

    this.notifyScheduled = true;
    const now = Date.now();
    const elapsed = now - this.lastDispatchTs;
    const remaining = LISTENER_THROTTLE_MS - elapsed;
    scheduleFlush(Math.max(0, remaining));
  }

  formatMemory(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  addListener(listener: (usage: MemoryUsage) => void): () => void {
    this.listeners.push(listener);
    
    // Send current memory stats to new listener
    const memory = this.getMemoryUsage();
    if (memory) {
      setTimeout(() => listener(memory), 0);
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  startMonitoring(intervalMs: number = 10000) {
    this.stopMonitoring();
    const clampedInterval = Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, intervalMs));
    this.observeIntervalMs = clampedInterval;
    this.checkInterval = createSafeInterval(() => this.checkMemory(), this.observeIntervalMs, {
      pauseWhenHidden: true,
      onSkip: reason => {
        if (reason === 'hidden') {
          console.debug('[memoryMonitor] Skipping memory check because document is hidden');
        }
      }
    });
  }

  stopMonitoring() {
    this.checkInterval?.();
    this.checkInterval = null;

    if (this.pendingIdleHandle !== null && cancelIdle) {
      cancelIdle(this.pendingIdleHandle);
      this.pendingIdleHandle = null;
    }
    this.notifyScheduled = false;
    this.pendingUsage = null;
  }

  getHistory(): MemoryUsage[] {
    return [...this.history];
  }

  getHighWaterMark(): number {
    return this.highWaterMark;
  }

  getStats() {
    const memory = this.getMemoryUsage();
    return {
      current: memory,
      highWaterMark: this.highWaterMark,
      history: this.history,
      listeners: this.listeners.length
    };
  }
}

// Export singleton instance
export const memoryMonitor = MemoryMonitor.getInstance();

// Start monitoring by default in development
if (process.env?.['NODE_ENV'] === 'development') {
  memoryMonitor.startMonitoring(30000); // Check every 30 seconds in development
}

// Add debug helper in development
if (process.env?.['NODE_ENV'] === 'development' && typeof window !== 'undefined') {
  (window as any).__MEMORY_MONITOR = memoryMonitor;
}
