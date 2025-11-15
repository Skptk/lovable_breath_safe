import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type EnvironmentFlags = {
  hasWindow: boolean;
  isTestEnvironment: boolean;
};

function resolveEnvFlags(): EnvironmentFlags {
  const hasWindow = typeof window !== 'undefined';
  const globalScope: typeof globalThis | undefined =
    typeof globalThis !== 'undefined' ? globalThis : undefined;

  const isTestEnvironment = Boolean(
    (typeof process !== 'undefined' && (process.env?.['VITEST'] || process.env?.['NODE_ENV'] === 'test')) ||
      (typeof import.meta !== 'undefined' &&
        (((import.meta as any)?.env?.VITEST) || ((import.meta as any)?.env?.MODE === 'test'))) ||
      (globalScope && ((globalScope as any).__vitest_worker__ || (globalScope as any).__vitest__ || (globalScope as any).vitest))
  );

  return { hasWindow, isTestEnvironment };
}

const ENV_FLAGS = resolveEnvFlags();
const REALTIME_ENVIRONMENT_ENABLED = ENV_FLAGS.hasWindow && !ENV_FLAGS.isTestEnvironment;
const MAX_CHANNELS = 12;
const MAX_CALLBACKS_PER_CHANNEL = 10;
const MAX_PENDING_RESOLVERS_PER_CHANNEL = 5;
const PERFORMANCE_LOG_THRESHOLD_MS = 120;
const CALLBACK_WARN_THRESHOLD_MS = 24;

export type ChannelSubscriptionConfig = {
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
};

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

type ChannelEntry = {
  channel: RealtimeChannel | null;
  callbacks: Set<(payload: any) => void>;
  refs: number;
  config?: ChannelSubscriptionConfig;
  reconnectAttempts: number;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
};

const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 5;

export class RealtimeConnectionManager {
  private static instance: RealtimeConnectionManager | null = null;

  private readonly channels = new Map<string, ChannelEntry>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();
  private readonly pendingReadyResolvers = new Map<string, Set<(channel: RealtimeChannel | null) => void>>();

  private status: ConnectionStatus = 'disconnected';
  private totalReconnectAttempts = 0;

  private constructor() {}

  public static getInstance(): RealtimeConnectionManager {
    if (!RealtimeConnectionManager.instance) {
      RealtimeConnectionManager.instance = new RealtimeConnectionManager();
    }

    return RealtimeConnectionManager.instance;
  }

  public getConnectionStatus(): ConnectionStatus {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return 'disconnected';
    }
    return this.status;
  }

  public onConnectionStatus(listener: (status: ConnectionStatus) => void): () => void {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      listener('disconnected');
      return () => {};
    }
    this.statusListeners.add(listener);
    listener(this.status);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public subscribe(channelName: string, callback: (payload: any) => void, config?: ChannelSubscriptionConfig): void {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return;
    }
    if (!channelName || typeof callback !== 'function') {
      console.warn('[RealtimeConnectionManager] Invalid subscription arguments', { channelName });
      return;
    }

    if (!this.channels.has(channelName) && this.channels.size >= MAX_CHANNELS) {
      console.warn('[RealtimeConnectionManager] Channel limit reached, denying subscription', {
        channelName,
        maxChannels: MAX_CHANNELS,
      });
      return;
    }

    const entry = this.channels.get(channelName);

    if (entry) {
      if (entry.callbacks.size >= MAX_CALLBACKS_PER_CHANNEL) {
        console.warn('[RealtimeConnectionManager] Callback limit reached for channel', {
          channelName,
          maxCallbacks: MAX_CALLBACKS_PER_CHANNEL,
        });
        return;
      }
      entry.callbacks.add(callback);
      entry.refs += 1;
      return;
    }

    const newEntry: ChannelEntry = {
      channel: null,
      callbacks: new Set([callback]),
      refs: 1,
      config: this.deriveConfig(channelName, config),
      reconnectAttempts: 0,
      reconnectTimeout: null,
    };

    this.channels.set(channelName, newEntry);
    this.startSubscription(channelName, newEntry);
  }

  public unsubscribe(channelName: string, callback?: (payload: any) => void): void {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return;
    }
    const entry = this.channels.get(channelName);
    if (!entry) {
      return;
    }

    if (callback) {
      entry.callbacks.delete(callback);
    }

    entry.refs = Math.max(0, entry.refs - 1);

    if (entry.refs === 0 || entry.callbacks.size === 0) {
      void this.teardownChannel(channelName, entry);
      this.channels.delete(channelName);

      if (this.channels.size === 0) {
        this.setConnectionStatus('disconnected');
      }
    }
  }

  public cleanup(): void {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return;
    }
    for (const [channelName, entry] of this.channels.entries()) {
      void this.teardownChannel(channelName, entry);
    }

    this.channels.clear();
    this.setConnectionStatus('disconnected');
  }

  public isChannelActive(channelName: string): boolean {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return false;
    }
    return this.channels.has(channelName);
  }

  public getChannel(channelName: string): RealtimeChannel | null {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return null;
    }
    return this.channels.get(channelName)?.channel ?? null;
  }

  public async waitForConnection(timeout = 5_000): Promise<boolean> {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return false;
    }
    const start = Date.now();

    if (!supabase.realtime.isConnected()) {
      try {
        await supabase.realtime.connect();
      } catch (error) {
        console.warn('[RealtimeConnectionManager] Failed to start realtime connection', error);
      }
    }

    while (!supabase.realtime.isConnected()) {
      if (Date.now() - start >= timeout) {
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return true;
  }

  public async ensureChannelReady(channelName: string, timeout = 5_000): Promise<RealtimeChannel | null> {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return null;
    }
    const existing = this.channels.get(channelName);
    if (existing?.channel) {
      return existing.channel;
    }

    await this.waitForConnection(timeout);

    return new Promise<RealtimeChannel | null>((resolve) => {
      const resolver = (channel: RealtimeChannel | null) => {
        resolve(channel);
      };

      this.registerPendingResolver(channelName, resolver);

      setTimeout(() => {
        const channel = this.channels.get(channelName)?.channel ?? null;
        resolve(channel);
      }, timeout);
    });
  }

  public getStatusSummary(): {
    enabled: boolean;
    activeChannels: string[];
    totalChannels: number;
    connectionStatus: ConnectionStatus;
    reconnectAttempts: number;
  } {
    return {
      enabled: true,
      activeChannels: Array.from(this.channels.keys()),
      totalChannels: this.channels.size,
      connectionStatus: this.status,
      reconnectAttempts: this.totalReconnectAttempts,
    };
  }

  public resetConnectionState(): void {
    this.totalReconnectAttempts = 0;
    this.setConnectionStatus(this.channels.size > 0 ? 'connected' : 'disconnected');
  }

  public reset(): void {
    this.cleanup();
    this.totalReconnectAttempts = 0;
  }

  public destroy(): void {
    this.cleanup();
    this.statusListeners.clear();
    this.pendingReadyResolvers.clear();
    this.totalReconnectAttempts = 0;
    this.status = 'disconnected';
    RealtimeConnectionManager.instance = null;
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return;
    }
    if (this.status === status) {
      return;
    }

    this.status = status;

    for (const listener of Array.from(this.statusListeners)) {
      try {
        listener(status);
      } catch (error) {
        console.error('[RealtimeConnectionManager] Connection status listener error', error);
      }
    }
  }

  private startSubscription(channelName: string, entry: ChannelEntry): void {
    if (entry.reconnectTimeout) {
      clearTimeout(entry.reconnectTimeout);
      entry.reconnectTimeout = null;
    }

    this.setConnectionStatus(entry.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const channel = supabase.channel(channelName);
    entry.channel = channel;

    const handlePayload = (payload: any) => {
      this.dispatch(channelName, payload);
    };

    if (entry.config?.event && entry.config?.schema && entry.config?.table) {
      (channel as any).on(
        'postgres_changes',
        {
          event: entry.config.event,
          schema: entry.config.schema,
          table: entry.config.table,
          filter: entry.config.filter,
        },
        handlePayload,
      );
    } else {
      (channel as any).on('*', handlePayload);
    }

    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        entry.reconnectAttempts = 0;
        this.setConnectionStatus('connected');
        this.resolvePendingReady(channelName, channel);
      } else if (status === 'CLOSED') {
        this.scheduleReconnect(channelName, entry);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[RealtimeConnectionManager] Channel error', {
          channelName,
          status,
          error,
        });
        this.scheduleReconnect(channelName, entry);
      }
    });
  }

  private scheduleReconnect(channelName: string, entry: ChannelEntry): void {
    if (entry.refs === 0) {
      return;
    }

    if (entry.reconnectTimeout) {
      return;
    }

    if (entry.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[RealtimeConnectionManager] Max reconnect attempts reached', { channelName });
      this.setConnectionStatus('disconnected');
      return;
    }

    entry.reconnectAttempts += 1;
    this.totalReconnectAttempts += 1;
    this.setConnectionStatus('reconnecting');

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, entry.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS,
    );

    entry.reconnectTimeout = setTimeout(() => {
      entry.reconnectTimeout = null;

      if (!this.channels.has(channelName) || entry.refs === 0) {
        return;
      }

      this.startSubscription(channelName, entry);
    }, delay);
  }

  private async teardownChannel(channelName: string, entry: ChannelEntry): Promise<void> {
    if (entry.reconnectTimeout) {
      clearTimeout(entry.reconnectTimeout);
      entry.reconnectTimeout = null;
    }

    if (entry.channel) {
      try {
        await entry.channel.unsubscribe();
      } catch (error) {
        console.warn('[RealtimeConnectionManager] Channel unsubscribe failed', { channelName, error });
      }

      try {
        supabase.removeChannel(entry.channel);
      } catch (error) {
        console.warn('[RealtimeConnectionManager] Channel removal failed', { channelName, error });
      }
    }

    entry.channel = null;
    entry.callbacks.clear();
    this.resolvePendingReady(channelName, null);
  }

  private dispatch(channelName: string, payload: any): void {
    const entry = this.channels.get(channelName);
    if (!entry || entry.callbacks.size === 0) {
      return;
    }

    const callbacks = Array.from(entry.callbacks);

      const invokeCallbacks = () => {
        const start = performance.now();
        let slowestCallbackDuration = 0;
        let slowestCallbackName: string | null = null;
        const slowCallbacks: { name: string; duration: number }[] = [];

        // Optimized: Use startTransition for React state updates to avoid blocking
        const React = (typeof window !== 'undefined' && (window as any).React) || null;
        const useTransition = React?.startTransition || ((fn: () => void) => fn);

        for (const callback of callbacks) {
          const callbackStart = performance.now();
          try {
            // Wrap callback in startTransition to defer React state updates
            useTransition(() => {
              callback(payload);
            });
          } catch (error) {
            console.error('[RealtimeConnectionManager] Subscription callback error', { channelName, error });
          }
          const callbackDuration = performance.now() - callbackStart;
          if (callbackDuration > slowestCallbackDuration) {
            slowestCallbackDuration = callbackDuration;
            slowestCallbackName = callback.name || 'anonymous';
          }
          if (callbackDuration >= CALLBACK_WARN_THRESHOLD_MS) {
            slowCallbacks.push({
              name: callback.name || 'anonymous',
              duration: callbackDuration,
            });
          }
        }

      const duration = performance.now() - start;
      if (duration >= PERFORMANCE_LOG_THRESHOLD_MS) {
        console.warn('[RealtimeConnectionManager] Slow message dispatch detected', {
          channelName,
          duration,
          callbackCount: callbacks.length,
          slowestCallback: slowestCallbackName,
          slowestCallbackDuration,
          payloadMetadata: {
            keys: payload ? Object.keys(payload) : [],
          },
        });
      }

      if (slowCallbacks.length > 0) {
        slowCallbacks.sort((a, b) => b.duration - a.duration);
        console.warn('[RealtimeConnectionManager] Slow subscription callbacks detected', {
          channelName,
          callbacks: slowCallbacks.slice(0, 5),
        });
      }
    };

    const schedule = () => {
      try {
        invokeCallbacks();
      } catch (error) {
        console.error('[RealtimeConnectionManager] Dispatch execution failed', { channelName, error });
      }
    };

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(schedule);
    } else {
      Promise.resolve().then(schedule).catch((error) => {
        console.error('[RealtimeConnectionManager] Deferred dispatch failed', { channelName, error });
      });
    }
  }

  private deriveConfig(channelName: string, provided?: ChannelSubscriptionConfig): ChannelSubscriptionConfig | undefined {
    if (provided) {
      return provided;
    }

    if (channelName.includes('notifications')) {
      const userId = channelName.split('-').pop();
      return {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: userId ? `user_id=eq.${userId}` : undefined,
      };
    }

    if (channelName.includes('user-profile-points')) {
      const userId = channelName.split('-').pop();
      return {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: userId ? `user_id=eq.${userId}` : undefined,
      };
    }

    if (channelName.includes('user-points')) {
      const userId = channelName.split('-').pop();
      return {
        event: 'INSERT',
        schema: 'public',
        table: 'user_points',
        filter: userId ? `user_id=eq.${userId}` : undefined,
      };
    }

    return undefined;
  }

  private registerPendingResolver(channelName: string, resolver: (channel: RealtimeChannel | null) => void): void {
    if (!REALTIME_ENVIRONMENT_ENABLED) {
      return;
    }
    const set = this.pendingReadyResolvers.get(channelName) ?? new Set();
    if (set.size >= MAX_PENDING_RESOLVERS_PER_CHANNEL) {
      console.warn('[RealtimeConnectionManager] Pending resolver limit reached, dropping resolver', {
        channelName,
        maxResolvers: MAX_PENDING_RESOLVERS_PER_CHANNEL,
      });
      return;
    }
    set.add(resolver);
    this.pendingReadyResolvers.set(channelName, set);
  }

  private resolvePendingReady(channelName: string, channel: RealtimeChannel | null): void {
    const resolvers = this.pendingReadyResolvers.get(channelName);
    if (!resolvers) {
      return;
    }

    for (const resolve of resolvers) {
      try {
        resolve(channel);
      } catch (error) {
        console.error('[RealtimeConnectionManager] Pending ready resolver failed', error);
      }
    }

    this.pendingReadyResolvers.delete(channelName);
  }
}

export function getRealtimeManager(): RealtimeConnectionManager {
  return RealtimeConnectionManager.getInstance();
}

export function subscribeToChannel(
  channelName: string,
  callback: (payload: any) => void,
  config?: ChannelSubscriptionConfig,
): void {
  RealtimeConnectionManager.getInstance().subscribe(channelName, callback, config);
}

export function unsubscribeFromChannel(
  channelName: string,
  callback?: (payload: any) => void,
): void {
  RealtimeConnectionManager.getInstance().unsubscribe(channelName, callback);
}

export function cleanupAllChannels(): void {
  RealtimeConnectionManager.getInstance().cleanup();
}

export function getChannelStatus() {
  return RealtimeConnectionManager.getInstance().getStatusSummary();
}

export function isChannelActive(channelName: string): boolean {
  return RealtimeConnectionManager.getInstance().isChannelActive(channelName);
}

export function ensureChannelReady(channelName: string, timeout?: number) {
  return RealtimeConnectionManager.getInstance().ensureChannelReady(channelName, timeout);
}

export function getExistingChannel(channelName: string): RealtimeChannel | null {
  return RealtimeConnectionManager.getInstance().getChannel(channelName);
}

export function resetConnectionState(): void {
  RealtimeConnectionManager.getInstance().resetConnectionState();
}

export function getConnectionStatus(): ConnectionStatus {
  return RealtimeConnectionManager.getInstance().getConnectionStatus();
}

export function addConnectionStatusListener(listener: (status: ConnectionStatus) => void): () => void {
  return RealtimeConnectionManager.getInstance().onConnectionStatus(listener);
}

export function destroyRealtimeManager(): void {
  RealtimeConnectionManager.getInstance().destroy();
}

export function resetRealtimeManager(): void {
  RealtimeConnectionManager.getInstance().reset();
}

export { getRealtimeManager as realtimeManager };
