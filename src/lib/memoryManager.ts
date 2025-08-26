import { logConnection } from '@/lib/logger';

// Memory Management System for Real-time Connections
// Prevents memory leaks and ensures proper cleanup

interface MemoryLeakDetection {
  subscriptionCount: number;
  eventListenerCount: number;
  channelCount: number;
  lastCleanup: number;
  memoryUsage: number;
}

interface CleanupTarget {
  type: 'subscription' | 'eventListener' | 'channel' | 'timeout' | 'interval';
  id: string;
  cleanup: () => void;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTargets: Map<string, CleanupTarget> = new Map();
  private memoryThresholds = {
    maxSubscriptions: 50,
    maxEventListeners: 100,
    maxChannels: 20,
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    cleanupInterval: 30000, // 30 seconds
    maxCleanupAge: 300000 // 5 minutes
  };

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // Register a cleanup target
  registerCleanupTarget(
    type: CleanupTarget['type'],
    id: string,
    cleanup: () => void,
    priority: CleanupTarget['priority'] = 'medium'
  ): void {
    try {
      const target: CleanupTarget = {
        type,
        id,
        cleanup,
        timestamp: Date.now(),
        priority
      };

      this.cleanupTargets.set(id, target);
      logConnection.debug(`MemoryManager: Registered cleanup target ${type}:${id} with priority ${priority}`);
    } catch (error) {
      logConnection.error('MemoryManager: Failed to register cleanup target:', error);
    }
  }

  // Unregister a cleanup target
  unregisterCleanupTarget(id: string): void {
    try {
      const target = this.cleanupTargets.get(id);
      if (target) {
        // Execute cleanup before removing
        this.executeCleanup(target);
        this.cleanupTargets.delete(id);
        logConnection.debug(`MemoryManager: Unregistered and cleaned up target: ${id}`);
      }
    } catch (error) {
      logConnection.error(`MemoryManager: Failed to unregister cleanup target ${id}:`, error);
    }
  }

  // Execute cleanup for a specific target
  private executeCleanup(target: CleanupTarget): void {
    try {
      if (target.cleanup && typeof target.cleanup === 'function') {
        target.cleanup();
        logConnection.debug(`MemoryManager: Executed cleanup for ${target.type}:${target.id}`);
      }
    } catch (error) {
      logConnection.error(`MemoryManager: Cleanup execution failed for ${target.type}:${target.id}:`, error);
    }
  }

  // Force cleanup of all targets
  forceCleanup(): void {
    try {
      logConnection.info('MemoryManager: Force cleanup initiated');
      
      const targets = Array.from(this.cleanupTargets.values());
      let cleanedCount = 0;

      // Sort by priority (high first) and timestamp (oldest first)
      targets.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      for (const target of targets) {
        try {
          this.executeCleanup(target);
          this.cleanupTargets.delete(target.id);
          cleanedCount++;
        } catch (error) {
          logConnection.error(`MemoryManager: Failed to cleanup target ${target.id}:`, error);
        }
      }

      logConnection.info(`MemoryManager: Force cleanup completed. Cleaned ${cleanedCount} targets`);
    } catch (error) {
      logConnection.error('MemoryManager: Force cleanup failed:', error);
    }
  }

  // Get memory usage statistics
  getMemoryStats(): MemoryLeakDetection {
    try {
      const now = Date.now();
      const subscriptions = Array.from(this.cleanupTargets.values()).filter(t => t.type === 'subscription');
      const eventListeners = Array.from(this.cleanupTargets.values()).filter(t => t.type === 'eventListener');
      const channels = Array.from(this.cleanupTargets.values()).filter(t => t.type === 'channel');

      // Estimate memory usage (rough calculation)
      const memoryUsage = this.estimateMemoryUsage();

      return {
        subscriptionCount: subscriptions.length,
        eventListenerCount: eventListeners.length,
        channelCount: channels.length,
        lastCleanup: now,
        memoryUsage
      };
    } catch (error) {
      logConnection.error('MemoryManager: Failed to get memory stats:', error);
      return {
        subscriptionCount: 0,
        eventListenerCount: 0,
        channelCount: 0,
        lastCleanup: Date.now(),
        memoryUsage: 0
      };
    }
  }

  // Estimate memory usage
  private estimateMemoryUsage(): number {
    try {
      let totalMemory = 0;
      
      // Base memory for the manager itself
      totalMemory += 1024; // 1KB base

      // Memory for each cleanup target
      for (const target of this.cleanupTargets.values()) {
        // Rough estimates based on type
        switch (target.type) {
          case 'subscription':
            totalMemory += 2048; // 2KB per subscription
            break;
          case 'eventListener':
            totalMemory += 1024; // 1KB per event listener
            break;
          case 'channel':
            totalMemory += 4096; // 4KB per channel
            break;
          case 'timeout':
          case 'interval':
            totalMemory += 512; // 512B per timeout/interval
            break;
        }
      }

      return totalMemory;
    } catch (error) {
      logConnection.error('MemoryManager: Failed to estimate memory usage:', error);
      return 0;
    }
  }

  // Check for memory leaks
  detectMemoryLeaks(): boolean {
    try {
      const stats = this.getMemoryStats();
      let hasLeaks = false;

      // Check subscription count
      if (stats.subscriptionCount > this.memoryThresholds.maxSubscriptions) {
        logConnection.warn(`MemoryManager: High subscription count detected: ${stats.subscriptionCount}/${this.memoryThresholds.maxSubscriptions}`);
        hasLeaks = true;
      }

      // Check event listener count
      if (stats.eventListenerCount > this.memoryThresholds.maxEventListeners) {
        logConnection.warn(`MemoryManager: High event listener count detected: ${stats.eventListenerCount}/${this.memoryThresholds.maxEventListeners}`);
        hasLeaks = true;
      }

      // Check channel count
      if (stats.channelCount > this.memoryThresholds.maxChannels) {
        logConnection.warn(`MemoryManager: High channel count detected: ${stats.channelCount}/${this.memoryThresholds.maxChannels}`);
        hasLeaks = true;
      }

      // Check memory usage
      if (stats.memoryUsage > this.memoryThresholds.maxMemoryUsage) {
        logConnection.warn(`MemoryManager: High memory usage detected: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB/${(this.memoryThresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
        hasLeaks = true;
      }

      return hasLeaks;
    } catch (error) {
      logConnection.error('MemoryManager: Memory leak detection failed:', error);
      return false;
    }
  }

  // Start memory monitoring
  private startMemoryMonitoring(): void {
    try {
      setInterval(() => {
        if (this.detectMemoryLeaks()) {
          logConnection.warn('MemoryManager: Memory leaks detected, initiating cleanup');
          this.performPreventiveCleanup();
        }

        // Clean up old targets
        this.cleanupOldTargets();
      }, this.memoryThresholds.cleanupInterval);

      logConnection.info('MemoryManager: Memory monitoring started');
    } catch (error) {
      logConnection.error('MemoryManager: Failed to start memory monitoring:', error);
    }
  }

  // Perform preventive cleanup
  private performPreventiveCleanup(): void {
    try {
      const now = Date.now();
      const oldTargets = Array.from(this.cleanupTargets.values())
        .filter(target => now - target.timestamp > this.memoryThresholds.maxCleanupAge);

      let cleanedCount = 0;
      for (const target of oldTargets) {
        try {
          this.executeCleanup(target);
          this.cleanupTargets.delete(target.id);
          cleanedCount++;
        } catch (error) {
          logConnection.error(`MemoryManager: Failed to cleanup old target ${target.id}:`, error);
        }
      }

      if (cleanedCount > 0) {
        logConnection.info(`MemoryManager: Preventive cleanup completed. Cleaned ${cleanedCount} old targets`);
      }
    } catch (error) {
      logConnection.error('MemoryManager: Preventive cleanup failed:', error);
    }
  }

  // Clean up old targets
  private cleanupOldTargets(): void {
    try {
      const now = Date.now();
      const targetsToRemove: string[] = [];

      for (const [id, target] of this.cleanupTargets) {
        if (now - target.timestamp > this.memoryThresholds.maxCleanupAge) {
          targetsToRemove.push(id);
        }
      }

      for (const id of targetsToRemove) {
        this.unregisterCleanupTarget(id);
      }

      if (targetsToRemove.length > 0) {
        logConnection.debug(`MemoryManager: Cleaned up ${targetsToRemove.length} old targets`);
      }
    } catch (error) {
      logConnection.error('MemoryManager: Old target cleanup failed:', error);
    }
  }

  // Destroy the memory manager
  destroy(): void {
    try {
      logConnection.info('MemoryManager: Destroying memory manager');
      this.forceCleanup();
      this.cleanupTargets.clear();
      MemoryManager.instance = null as any;
    } catch (error) {
      logConnection.error('MemoryManager: Failed to destroy memory manager:', error);
    }
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// Utility functions for common cleanup operations
export const registerSubscription = (id: string, cleanup: () => void, priority: CleanupTarget['priority'] = 'high') => {
  memoryManager.registerCleanupTarget('subscription', id, cleanup, priority);
};

export const registerEventListener = (id: string, cleanup: () => void, priority: CleanupTarget['priority'] = 'medium') => {
  memoryManager.registerCleanupTarget('eventListener', id, cleanup, priority);
};

export const registerChannel = (id: string, cleanup: () => void, priority: CleanupTarget['priority'] = 'high') => {
  memoryManager.registerCleanupTarget('channel', id, cleanup, priority);
};

export const registerTimeout = (id: string, cleanup: () => void, priority: CleanupTarget['priority'] = 'low') => {
  memoryManager.registerCleanupTarget('timeout', id, cleanup, priority);
};

export const registerInterval = (id: string, cleanup: () => void, priority: CleanupTarget['priority'] = 'low') => {
  memoryManager.registerCleanupTarget('interval', id, cleanup, priority);
};

export const unregisterCleanup = (id: string) => {
  memoryManager.unregisterCleanupTarget(id);
};

export const getMemoryStats = () => memoryManager.getMemoryStats();
export const detectMemoryLeaks = () => memoryManager.detectMemoryLeaks();
export const forceCleanup = () => memoryManager.forceCleanup();
