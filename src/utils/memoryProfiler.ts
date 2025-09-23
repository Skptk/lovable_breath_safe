/**
 * Memory Profiler Utility
 * 
 * This utility provides functions to profile and debug memory usage in the browser.
 * It can help identify memory leaks and optimize memory usage.
 */

interface MemorySnapshot {
  timestamp: number;
  heapSize: number;
  nodeCount: number;
  eventListeners: number;
  detachedElements: number;
  heapInfo?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface MemoryProfile {
  startTime: number;
  endTime?: number;
  snapshots: MemorySnapshot[];
  maxHeapSize: number;
  minHeapSize: number;
  averageHeapSize: number;
  totalNodeGrowth: number;
  totalListenerGrowth: number;
  potentialLeaks: string[];
}

class MemoryProfiler {
  private isProfiling: boolean = false;
  private profile: MemoryProfile = {
    startTime: 0,
    snapshots: [],
    maxHeapSize: 0,
    minHeapSize: Infinity,
    averageHeapSize: 0,
    totalNodeGrowth: 0,
    totalListenerGrowth: 0,
    potentialLeaks: [],
  };
  
  private intervalId: number | null = null;
  private lastNodeCount: number = 0;
  private lastListenerCount: number = 0;
  
  /**
   * Start memory profiling
   * @param intervalMs Interval between snapshots in milliseconds (default: 1000)
   */
  public start(intervalMs: number = 1000): void {
    if (this.isProfiling) {
      console.warn('Memory profiler is already running');
      return;
    }
    
    this.isProfiling = true;
    this.profile = {
      startTime: performance.now(),
      snapshots: [],
      maxHeapSize: 0,
      minHeapSize: Infinity,
      averageHeapSize: 0,
      totalNodeGrowth: 0,
      totalListenerGrowth: 0,
      potentialLeaks: [],
    };
    
    // Take initial snapshot
    this.takeSnapshot();
    
    // Set up periodic snapshots
    this.intervalId = window.setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
    
    console.log(`Memory profiler started with ${intervalMs}ms interval`);
  }
  
  /**
   * Stop memory profiling and return the profile results
   */
  public stop(): MemoryProfile {
    if (!this.isProfiling) {
      console.warn('Memory profiler is not running');
      return this.profile;
    }
    
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isProfiling = false;
    this.profile.endTime = performance.now();
    
    // Calculate averages
    if (this.profile.snapshots.length > 0) {
      const totalHeap = this.profile.snapshots.reduce(
        (sum, snap) => sum + snap.heapSize, 0
      );
      this.profile.averageHeapSize = totalHeap / this.profile.snapshots.length;
    }
    
    console.log('Memory profiler stopped');
    console.log('Profile summary:', this.getSummary());
    
    return this.profile;
  }
  
  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    if (!this.isProfiling) return;
    
    const snapshot: MemorySnapshot = {
      timestamp: performance.now(),
      heapSize: 0,
      nodeCount: this.countDOMNodes(),
      eventListeners: this.countEventListeners(),
      detachedElements: this.countDetachedElements(),
    };
    
    // Get heap size if available
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      if (mem) {
        snapshot.heapInfo = {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
        snapshot.heapSize = mem.usedJSHeapSize;
      }
    }
    
    // Update profile stats
    this.profile.snapshots.push(snapshot);
    this.profile.maxHeapSize = Math.max(this.profile.maxHeapSize, snapshot.heapSize);
    this.profile.minHeapSize = Math.min(this.profile.minHeapSize, snapshot.heapSize);
    
    // Check for node growth (potential leak)
    if (this.lastNodeCount > 0) {
      const nodeGrowth = snapshot.nodeCount - this.lastNodeCount;
      this.profile.totalNodeGrowth += nodeGrowth;
      
      if (nodeGrowth > 100) {
        const msg = `Significant DOM node growth detected: +${nodeGrowth} nodes`;
        if (!this.profile.potentialLeaks.includes(msg)) {
          this.profile.potentialLeaks.push(msg);
          console.warn(msg);
        }
      }
    }
    
    // Check for listener growth (potential leak)
    if (this.lastListenerCount > 0) {
      const listenerGrowth = snapshot.eventListeners - this.lastListenerCount;
      this.profile.totalListenerGrowth += listenerGrowth;
      
      if (listenerGrowth > 10) {
        const msg = `Significant event listener growth detected: +${listenerGrowth} listeners`;
        if (!this.profile.potentialLeaks.includes(msg)) {
          this.profile.potentialLeaks.push(msg);
          console.warn(msg);
        }
      }
    }
    
    this.lastNodeCount = snapshot.nodeCount;
    this.lastListenerCount = snapshot.eventListeners;
    
    console.log(`Snapshot #${this.profile.snapshots.length}`, {
      heapSize: this.formatBytes(snapshot.heapSize),
      nodes: snapshot.nodeCount,
      listeners: snapshot.eventListeners,
      detached: snapshot.detachedElements,
    });
  }
  
  /**
   * Count all DOM nodes in the document
   */
  private countDOMNodes(): number {
    return document.getElementsByTagName('*').length;
  }
  
  /**
   * Count all event listeners in the document
   */
  private countEventListeners(): number {
    // This is an approximation as we can't directly access all event listeners
    // in all browsers for security reasons
    let count = 0;
    
    const elements = document.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i];
      if ((elem as any).__events) {
        // jQuery events
        count += Object.keys((elem as any).__events).length;
      }
      // Add more framework-specific checks as needed
    }
    
    return count;
  }
  
  /**
   * Count potentially detached DOM elements
   */
  private countDetachedElements(): number {
    // This is a simplified check and may not catch all detached elements
    let count = 0;
    const walker = document.createTreeWalker(
      document,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    const nodes: Element[] = [];
    let node: Node | null;
    
    while ((node = walker.nextNode())) {
      if (node instanceof Element) {
        nodes.push(node);
      }
    }
    
    // Check if nodes are in the document
    for (const node of nodes) {
      if (!document.contains(node)) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Get a summary of the memory profile
   */
  public getSummary(): Record<string, any> {
    const duration = this.profile.endTime 
      ? (this.profile.endTime - this.profile.startTime) / 1000 
      : (performance.now() - this.profile.startTime) / 1000;
    
    return {
      duration: `${duration.toFixed(2)}s`,
      snapshots: this.profile.snapshots.length,
      maxHeapSize: this.formatBytes(this.profile.maxHeapSize),
      minHeapSize: this.formatBytes(this.profile.minHeapSize),
      averageHeapSize: this.formatBytes(this.profile.averageHeapSize),
      totalNodeGrowth: this.profile.totalNodeGrowth,
      totalListenerGrowth: this.profile.totalListenerGrowth,
      potentialLeaks: this.profile.potentialLeaks.length > 0 
        ? this.profile.potentialLeaks 
        : 'No obvious leaks detected',
    };
  }
  
  /**
   * Format bytes to a human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Take a heap snapshot (Chrome DevTools only)
   */
  public takeHeapSnapshot(label: string = 'Heap Snapshot'): void {
    if (typeof (window as any).chrome !== 'undefined' && 
        (window as any).chrome.devtools && 
        (window as any).chrome.devtools.inspectedWindow) {
      console.log(`Taking heap snapshot: ${label}`);
      (window as any).chrome.devtools.inspectedWindow.eval(
        'console.profile("' + label + '"); console.profileEnd("' + label + '")',
        function() {
          console.log('Heap snapshot captured in Chrome DevTools');
        }
      );
    } else if ((window as any).takeHeapSnapshot) {
      // Firefox
      (window as any).takeHeapSnapshot(label);
      console.log(`Heap snapshot captured: ${label}`);
    } else {
      console.warn('Heap snapshot not available in this environment');
    }
  }
  
  /**
   * Force garbage collection (works in Chrome with --js-flags="--expose-gc")
   */
  public forceGarbageCollection(): boolean {
    if ((window as any).gc) {
      (window as any).gc();
      console.log('Garbage collection forced');
      return true;
    }
    
    if ((window as any).CollectGarbage) {
      (window as any).CollectGarbage();
      console.log('Garbage collection forced (IE)');
      return true;
    }
    
    if ((window as any).opera && (window as any).collect) {
      (window as any).collect();
      console.log('Garbage collection forced (Opera)');
      return true;
    }
    
    console.warn('Garbage collection not available. Run Chrome with --js-flags="--expose-gc"');
    return false;
  }
}

// Export a singleton instance
export const memoryProfiler = new MemoryProfiler();

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).memoryProfiler = memoryProfiler;
}

// Example usage:
/*
// Start profiling
memoryProfiler.start(2000); // Take a snapshot every 2 seconds

// Later...
memoryProfiler.stop();

// Force GC
memoryProfiler.forceGarbageCollection();

// Take a heap snapshot
memoryProfiler.takeHeapSnapshot('After user interaction');
*/
