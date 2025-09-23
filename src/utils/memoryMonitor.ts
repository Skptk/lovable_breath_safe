interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
  percentUsed: number;
  timestamp: number;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private highWaterMark = 0;
  private checkInterval: number | null = null;
  private listeners: Array<(usage: MemoryUsage) => void> = [];
  private history: MemoryUsage[] = [];
  private readonly MAX_HISTORY = 100; // Keep last 100 readings

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
    
    return {
      used: usedJSHeapSize,
      total: totalJSHeapSize,
      limit: jsHeapSizeLimit,
      percentUsed: (usedJSHeapSize / jsHeapSizeLimit) * 100,
      timestamp: Date.now()
    };
  }

  private checkMemory() {
    const memory = this.getMemoryUsage();
    if (!memory) return;

    // Update high water mark
    this.highWaterMark = Math.max(this.highWaterMark, memory.used);
    
    // Add to history
    this.history.push(memory);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    // Notify listeners
    this.notifyListeners(memory);

    // Log warning if memory usage is high
    if (memory.percentUsed > 80) {
      console.warn(`High memory usage: ${this.formatMemory(memory.used)} / ${this.formatMemory(memory.total)} (${memory.percentUsed.toFixed(1)}%)`);
      
      // Trigger garbage collection if available
      if (window.gc) {
        console.log('Triggering garbage collection...');
        window.gc();
      }
    }
  }

  private notifyListeners(memory: MemoryUsage) {
    for (const listener of this.listeners) {
      try {
        listener(memory);
      } catch (error) {
        console.error('Error in memory monitor listener:', error);
      }
    }
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
    this.checkInterval = window.setInterval(() => this.checkMemory(), intervalMs);
  }

  stopMonitoring() {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
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
if (process.env.NODE_ENV === 'development') {
  memoryMonitor.startMonitoring(30000); // Check every 30 seconds in development
}

// Add debug helper in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).__MEMORY_MONITOR = memoryMonitor;
}
