import { logConnection } from '@/lib/logger';

// State Synchronization System
// Handles data consistency between client and server

interface SyncOperation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  optimisticData: any;
  timestamp: number;
  status: 'pending' | 'success' | 'failed' | 'conflict';
  retryCount: number;
  maxRetries: number;
}

interface ConflictResolution {
  operationId: string;
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  resolvedData: any;
  timestamp: number;
}

interface SyncConfig {
  maxRetries: number;
  retryDelay: number;
  conflictTimeout: number;
  batchSize: number;
  enableOptimisticUpdates: boolean;
  enableConflictResolution: boolean;
}

export class StateSynchronizer {
  private static instance: StateSynchronizer;
  private pendingOperations: Map<string, SyncOperation> = new Map();
  private conflictResolutions: Map<string, ConflictResolution> = new Map();
  private syncQueue: SyncOperation[] = [];
  private isProcessing = false;
  private config: SyncConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    conflictTimeout: 30000,
    batchSize: 10,
    enableOptimisticUpdates: true,
    enableConflictResolution: true
  };

  private constructor() {
    this.startSyncProcessor();
  }

  static getInstance(): StateSynchronizer {
    if (!StateSynchronizer.instance) {
      StateSynchronizer.instance = new StateSynchronizer();
    }
    return StateSynchronizer.instance;
  }

  // Configure the synchronizer
  configure(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    logConnection.info('StateSynchronizer: Configuration updated', this.config);
  }

  // Queue a sync operation
  queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'retryCount'>): string {
    try {
      const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const syncOp: SyncOperation = {
        ...operation,
        id,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        maxRetries: this.config.maxRetries
      };

      this.pendingOperations.set(id, syncOp);
      this.syncQueue.push(syncOp);

      logConnection.debug(`StateSynchronizer: Queued operation ${id} for table ${operation.table}`);
      return id;
    } catch (error) {
      logConnection.error('StateSynchronizer: Failed to queue operation:', error);
      throw error;
    }
  }

  // Process sync queue
  private async startSyncProcessor(): Promise<void> {
    try {
      setInterval(async () => {
        if (this.isProcessing || this.syncQueue.length === 0) return;

        this.isProcessing = true;
        await this.processSyncBatch();
        this.isProcessing = false;
      }, 1000); // Process every second

      logConnection.info('StateSynchronizer: Sync processor started');
    } catch (error) {
      logConnection.error('StateSynchronizer: Failed to start sync processor:', error);
    }
  }

  // Process a batch of sync operations
  private async processSyncBatch(): Promise<void> {
    try {
      const batch = this.syncQueue.splice(0, this.config.batchSize);
      logConnection.debug(`StateSynchronizer: Processing batch of ${batch.length} operations`);

      const promises = batch.map(operation => this.processOperation(operation));
      await Promise.allSettled(promises);

      // Clean up completed operations
      this.cleanupCompletedOperations();
    } catch (error) {
      logConnection.error('StateSynchronizer: Batch processing failed:', error);
    }
  }

  // Process individual operation
  private async processOperation(operation: SyncOperation): Promise<void> {
    try {
      if (operation.status !== 'pending') return;

      // Check if operation has exceeded retry limit
      if (operation.retryCount >= operation.maxRetries) {
        operation.status = 'failed';
        logConnection.warn(`StateSynchronizer: Operation ${operation.id} exceeded retry limit`);
        return;
      }

      // Attempt to sync with server
      const result = await this.syncWithServer(operation);
      
      if (result.success) {
        operation.status = 'success';
        logConnection.debug(`StateSynchronizer: Operation ${operation.id} completed successfully`);
      } else if (result.conflict) {
        operation.status = 'conflict';
        await this.handleConflict(operation, result.serverData);
      } else {
        // Retry on failure
        operation.retryCount++;
        operation.status = 'pending';
        this.syncQueue.push(operation);
        
        // Add delay before retry
        setTimeout(() => {
          if (operation.status === 'pending') {
            this.syncQueue.unshift(operation);
          }
        }, this.config.retryDelay * operation.retryCount);
      }
    } catch (error) {
      logConnection.error(`StateSynchronizer: Failed to process operation ${operation.id}:`, error);
      operation.status = 'failed';
    }
  }

  // Sync operation with server
  private async syncWithServer(operation: SyncOperation): Promise<{
    success: boolean;
    conflict?: boolean;
    serverData?: any;
    error?: any;
  }> {
    try {
      // Simulate server sync (replace with actual Supabase calls)
      const serverResponse = await this.performServerOperation(operation);
      
      if (serverResponse.success) {
        return { success: true };
      } else if (serverResponse.conflict) {
        return { success: false, conflict: true, serverData: serverResponse.serverData };
      } else {
        return { success: false, error: serverResponse.error };
      }
    } catch (error) {
      logConnection.error(`StateSynchronizer: Server sync failed for operation ${operation.id}:`, error);
      return { success: false, error };
    }
  }

  // Perform server operation (placeholder - replace with actual Supabase calls)
  private async performServerOperation(operation: SyncOperation): Promise<{
    success: boolean;
    conflict?: boolean;
    serverData?: any;
    error?: any;
  }> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      // Simulate occasional conflicts (10% chance)
      if (Math.random() < 0.1) {
        return {
          success: false,
          conflict: true,
          serverData: { ...operation.data, version: Date.now() }
        };
      }

      // Simulate occasional failures (5% chance)
      if (Math.random() < 0.05) {
        return {
          success: false,
          error: 'Simulated server error'
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Handle conflicts
  private async handleConflict(operation: SyncOperation, serverData: any): Promise<void> {
    try {
      logConnection.warn(`StateSynchronizer: Conflict detected for operation ${operation.id}`);

      if (!this.config.enableConflictResolution) {
        logConnection.warn(`StateSynchronizer: Conflict resolution disabled, marking operation as failed`);
        operation.status = 'failed';
        return;
      }

      // Attempt automatic conflict resolution
      const resolution = await this.resolveConflict(operation, serverData);
      
      if (resolution) {
        this.conflictResolutions.set(operation.id, resolution);
        
        // Retry operation with resolved data
        operation.data = resolution.resolvedData;
        operation.status = 'pending';
        operation.retryCount = 0;
        this.syncQueue.push(operation);
        
        logConnection.info(`StateSynchronizer: Conflict resolved for operation ${operation.id}`);
      } else {
        // Mark for manual resolution
        operation.status = 'conflict';
        logConnection.warn(`StateSynchronizer: Operation ${operation.id} requires manual conflict resolution`);
      }
    } catch (error) {
      logConnection.error(`StateSynchronizer: Failed to handle conflict for operation ${operation.id}:`, error);
      operation.status = 'failed';
    }
  }

  // Resolve conflicts automatically
  private async resolveConflict(operation: SyncOperation, serverData: any): Promise<ConflictResolution | null> {
    try {
      let resolvedData: any;
      let strategy: ConflictResolution['strategy'] = 'manual';

      switch (operation.type) {
        case 'INSERT':
          // For inserts, server-wins if there's a conflict
          strategy = 'server-wins';
          resolvedData = serverData;
          break;

        case 'UPDATE':
          // For updates, try to merge changes
          strategy = 'merge';
          resolvedData = this.mergeData(operation.data, serverData);
          break;

        case 'DELETE':
          // For deletes, server-wins
          strategy = 'server-wins';
          resolvedData = serverData;
          break;

        default:
          return null;
      }

      if (resolvedData) {
        return {
          operationId: operation.id,
          strategy,
          resolvedData,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      logConnection.error(`StateSynchronizer: Failed to resolve conflict for operation ${operation.id}:`, error);
      return null;
    }
  }

  // Merge data for conflict resolution
  private mergeData(clientData: any, serverData: any): any {
    try {
      if (!clientData || !serverData) return clientData || serverData;

      const merged = { ...serverData };

      // Merge client changes with server data
      for (const [key, value] of Object.entries(clientData)) {
        if (value !== undefined && value !== null) {
          merged[key] = value;
        }
      }

      return merged;
    } catch (error) {
      logConnection.error('StateSynchronizer: Failed to merge data:', error);
      return clientData;
    }
  }

  // Clean up completed operations
  private cleanupCompletedOperations(): void {
    try {
      const now = Date.now();
      const operationsToRemove: string[] = [];

      for (const [id, operation] of this.pendingOperations) {
        if (operation.status === 'success' || operation.status === 'failed') {
          // Remove operations older than 5 minutes
          if (now - operation.timestamp > 5 * 60 * 1000) {
            operationsToRemove.push(id);
          }
        } else if (operation.status === 'conflict') {
          // Remove conflicts older than conflict timeout
          if (now - operation.timestamp > this.config.conflictTimeout) {
            operationsToRemove.push(id);
          }
        }
      }

      for (const id of operationsToRemove) {
        this.pendingOperations.delete(id);
      }

      if (operationsToRemove.length > 0) {
        logConnection.debug(`StateSynchronizer: Cleaned up ${operationsToRemove.length} completed operations`);
      }
    } catch (error) {
      logConnection.error('StateSynchronizer: Failed to cleanup completed operations:', error);
    }
  }

  // Get sync status
  getSyncStatus(): {
    pending: number;
    success: number;
    failed: number;
    conflicts: number;
    total: number;
  } {
    try {
      let pending = 0, success = 0, failed = 0, conflicts = 0;

      for (const operation of this.pendingOperations.values()) {
        switch (operation.status) {
          case 'pending':
            pending++;
            break;
          case 'success':
            success++;
            break;
          case 'failed':
            failed++;
            break;
          case 'conflict':
            conflicts++;
            break;
        }
      }

      return {
        pending,
        success,
        failed,
        conflicts,
        total: this.pendingOperations.size
      };
    } catch (error) {
      logConnection.error('StateSynchronizer: Failed to get sync status:', error);
      return { pending: 0, success: 0, failed: 0, conflicts: 0, total: 0 };
    }
  }

  // Force retry of failed operations
  forceRetry(): void {
    try {
      let retryCount = 0;

      for (const operation of this.pendingOperations.values()) {
        if (operation.status === 'failed') {
          operation.status = 'pending';
          operation.retryCount = 0;
          this.syncQueue.push(operation);
          retryCount++;
        }
      }

      logConnection.info(`StateSynchronizer: Force retry initiated for ${retryCount} failed operations`);
    } catch (error) {
      logConnection.error('StateSynchronizer: Failed to force retry:', error);
    }
  }

  // Clear all operations
  clearAll(): void {
    try {
      this.pendingOperations.clear();
      this.syncQueue.length = 0;
      this.conflictResolutions.clear();
      logConnection.info('StateSynchronizer: All operations cleared');
    } catch (error) {
      logConnection.error('StateSynchronizer: Failed to clear all operations:', error);
    }
  }

  // Destroy the synchronizer
  destroy(): void {
    try {
      this.clearAll();
      this.isProcessing = false;
      StateSynchronizer.instance = null as any;
      logConnection.info('StateSynchronizer: Destroyed');
    } catch (error) {
      logConnection.error('StateSynchronizer: Failed to destroy:', error);
    }
  }
}

// Export singleton instance
export const stateSynchronizer = StateSynchronizer.getInstance();

// Utility functions for common operations
export const queueInsert = (table: string, data: any, optimisticData?: any) => {
  return stateSynchronizer.queueOperation({
    type: 'INSERT',
    table,
    data,
    optimisticData: optimisticData || data
  });
};

export const queueUpdate = (table: string, data: any, optimisticData?: any) => {
  return stateSynchronizer.queueOperation({
    type: 'UPDATE',
    table,
    data,
    optimisticData: optimisticData || data
  });
};

export const queueDelete = (table: string, data: any, optimisticData?: any) => {
  return stateSynchronizer.queueOperation({
    type: 'DELETE',
    table,
    data,
    optimisticData: optimisticData || data
  });
};

export const getSyncStatus = () => stateSynchronizer.getSyncStatus();
export const forceRetry = () => stateSynchronizer.forceRetry();
export const clearAll = () => stateSynchronizer.clearAll();
export const configure = (config: Partial<SyncConfig>) => stateSynchronizer.configure(config);
