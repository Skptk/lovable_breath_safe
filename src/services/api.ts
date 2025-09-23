import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useAppStore } from '@/store';
import { Database } from '@/types/supabase';

// Create a typed Supabase client
type Schema = Database['public'];
type Tables = Schema['Tables'];

// Define all table names including extended ones
type ExtendedTables = Tables & {
  profiles: {
    Row: { id: string; created_at?: string; [key: string]: any };
    Insert: { id: string; created_at?: string; [key: string]: any };
    Update: { id?: string; created_at?: string; [key: string]: any };
  };
  user_achievements: {
    Row: { id: string; user_id: string; created_at?: string; [key: string]: any };
    Insert: { id?: string; user_id: string; created_at?: string; [key: string]: any };
    Update: { id?: string; user_id?: string; created_at?: string; [key: string]: any };
  };
  user_streaks: {
    Row: { id: string; user_id: string; created_at?: string; [key: string]: any };
    Insert: { id?: string; user_id: string; created_at?: string; [key: string]: any };
    Update: { id?: string; user_id?: string; created_at?: string; [key: string]: any };
  };
  withdrawal_requests: {
    Row: { id: string; user_id: string; created_at?: string; [key: string]: any };
    Insert: { id?: string; user_id: string; created_at?: string; [key: string]: any };
    Update: { id?: string; user_id?: string; created_at?: string; [key: string]: any };
  };
};

type TableName = keyof Tables;
type ExtendedTableName = TableName | keyof Omit<ExtendedTables, keyof Tables>;

type TableRow<T extends ExtendedTableName> = T extends keyof Tables 
  ? Tables[T]['Row'] 
  : T extends keyof ExtendedTables 
    ? ExtendedTables[T]['Row'] 
    : never;

type TableInsert<T extends ExtendedTableName> = T extends keyof Tables 
  ? Tables[T]['Insert'] 
  : T extends keyof ExtendedTables 
    ? ExtendedTables[T]['Insert'] 
    : never;

type TableUpdate<T extends ExtendedTableName> = T extends keyof Tables 
  ? Tables[T]['Update'] 
  : T extends keyof ExtendedTables 
    ? ExtendedTables[T]['Update'] 
    : never;

// Get the Supabase URL and key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create the Supabase client with proper typing
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// API Response types
export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
  timestamp: number;
}

export interface ApiOptions {
  cache?: boolean;
  cacheTTL?: number;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

// Default options
const defaultOptions: Required<ApiOptions> = {
  cache: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  retry: true,
  retryCount: 3,
  retryDelay: 1000,
  timeout: 30000, // 30 seconds
};

// Cache configuration
const CACHE_CONFIG = {
  MAX_ITEMS: 100, // Maximum number of items to store in cache
  MAX_ITEM_SIZE: 1024 * 1024, // 1MB max size per item
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
};

// Enhanced cache storage with size tracking
const cache = new Map<string, { 
  data: any; 
  timestamp: number; 
  ttl: number; 
  size: number; // Track size in bytes
}>();

let totalCacheSize = 0; // Track total cache size in bytes

// Utility functions
const generateCacheKey = (table: string, query: string, filters: any): string => {
  return `${table}:${query}:${JSON.stringify(filters)}`;
};

const isCacheValid = (key: string): boolean => {
  const cached = cache.get(key);
  if (!cached) return false;
  
  const now = Date.now();
  return now - cached.timestamp < cached.ttl;
};

const getCachedData = (key: string): any => {
  const cached = cache.get(key);
  return cached?.data || null;
};

const calculateObjectSize = (obj: any): number => {
  try {
    const jsonString = JSON.stringify(obj);
    return new TextEncoder().encode(jsonString).length;
  } catch (error) {
    console.warn('Failed to calculate object size:', error);
    return 0;
  }
};

const setCachedData = (key: string, data: any, ttl: number = CACHE_CONFIG.DEFAULT_TTL): void => {
  const size = calculateObjectSize(data);
  
  // Skip caching if item is too large
  if (size > CACHE_CONFIG.MAX_ITEM_SIZE) {
    console.warn('Item too large to cache, skipping');
    return;
  }
  
  // Remove oldest items if cache is full
  while (totalCacheSize + size > CACHE_CONFIG.MAX_ITEMS * CACHE_CONFIG.MAX_ITEM_SIZE && cache.size > 0) {
    const oldestKey = cache.keys().next().value;
    const oldestItem = cache.get(oldestKey);
    if (oldestItem) {
      totalCacheSize -= oldestItem.size;
      cache.delete(oldestKey);
    }
  }
  
  // Add to cache
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    size,
  });
  totalCacheSize += size;
};

const cleanupCache = (force: boolean = false): void => {
  const now = Date.now();
  let removedCount = 0;
  let removedSize = 0;
  
  for (const [key, item] of cache.entries()) {
    // Remove expired items or if forced cleanup
    if (force || now - item.timestamp > item.ttl) {
      removedCount++;
      removedSize += item.size;
      cache.delete(key);
    }
  }
  
  totalCacheSize -= removedSize;
  
  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} items (${removedSize} bytes) from cache`);
  }
};

// Set up periodic cleanup
setInterval(() => cleanupCache(), CACHE_CONFIG.CLEANUP_INTERVAL);

// Retry logic
const retryWithDelay = async <T>(
  fn: () => Promise<T>,
  retryCount: number,
  delay: number
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retryCount <= 0) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithDelay(fn, retryCount - 1, delay);
  }
};

// Timeout wrapper
const withTimeout = <T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
};

// Invalidate cache for a specific table
const invalidateCacheForTable = (table: string): void => {
  const keysToDelete: string[] = [];
  
  for (const key of cache.keys()) {
    if (key.startsWith(`${table}:`)) {
      keysToDelete.push(key);
    }
  }
  
  for (const key of keysToDelete) {
    const cached = cache.get(key);
    if (cached) {
      totalCacheSize -= cached.size;
      cache.delete(key);
    }
  }
};

// Main API service class
export class ApiService {
  private static instance: ApiService;
  
  private constructor() {
    // Clean up cache every 5 minutes
    setInterval(() => cleanupCache(), 5 * 60 * 1000);
  }
  
  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Generic query method with proper TypeScript types
  async query<T = any, TTable extends ExtendedTableName = ExtendedTableName>(
    table: TTable,
    query: string = '*',
    filters: Partial<TableRow<TTable>> = {},
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    const cacheKey = generateCacheKey(table as string, query, filters);
    
    try {
      // Check cache first
      if (opts.cache && isCacheValid(cacheKey)) {
        return {
          data: getCachedData(cacheKey),
          error: null,
          success: true,
          timestamp: Date.now(),
        };
      }

      // Execute query with retry logic
      const executeQuery = async (): Promise<T> => {
        const { data, error } = await withTimeout(
          (async () => {
            const { data: result, error: queryError } = await supabase
              .from(table as string)
              .select(query)
              .match(filters as any);
            return { data: result, error: queryError };
          })(),
          opts.timeout
        ) as { data: T; error: any };

        if (error) throw error;
        return data as T;
      };

      const result = opts.retry
        ? await retryWithDelay(executeQuery, opts.retryCount, opts.retryDelay)
        : await executeQuery();

      // Cache the result
      if (opts.cache) {
        setCachedData(cacheKey, result, opts.cacheTTL);
      }

      return {
        data: result,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      
      // Log error for debugging
      console.error(`API Error in ${String(table)}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  // Generic insert method
  async insert<T = any, TTable extends ExtendedTableName = ExtendedTableName>(
    table: TTable,
    data: TableInsert<TTable> | TableInsert<TTable>[],
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeInsert = async (): Promise<T> => {
        const { data: result, error } = await withTimeout(
          (async () => {
            const { data: insertData, error: insertError } = await supabase
              .from(table as string)
              .insert(data as any)
              .select();
            return { data: insertData, error: insertError };
          })(),
          opts.timeout
        ) as { data: T; error: any };

        if (error) throw error;
        return result as T;
      };

      const result = opts.retry
        ? await retryWithDelay(executeInsert, opts.retryCount, opts.retryDelay)
        : await executeInsert();

      // Invalidate cache for this table
      invalidateCacheForTable(table as string);

      return {
        data: result,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error(`API Insert Error in ${String(table)}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  // Generic update method
  async update<T = any, TTable extends ExtendedTableName = ExtendedTableName>(
    table: TTable,
    data: TableUpdate<TTable>,
    filters: Partial<TableRow<TTable>>,
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeUpdate = async (): Promise<T> => {
        const { data: result, error } = await withTimeout(
          (async () => {
            const { data: updateData, error: updateError } = await supabase
              .from(table as string)
              .update(data as any)
              .match(filters as any)
              .select();
            return { data: updateData, error: updateError };
          })(),
          opts.timeout
        ) as { data: T; error: any };

        if (error) throw error;
        return result as T;
      };

      const result = opts.retry
        ? await retryWithDelay(executeUpdate, opts.retryCount, opts.retryDelay)
        : await executeUpdate();

      // Invalidate cache for this table
      invalidateCacheForTable(table as string);

      return {
        data: result,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error(`API Update Error in ${String(table)}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  // Generic delete method
  async delete<T = any, TTable extends ExtendedTableName = ExtendedTableName>(
    table: TTable,
    filters: Partial<TableRow<TTable>>,
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeDelete = async (): Promise<T> => {
        const { data, error } = await withTimeout(
          (async () => {
            const { data: deleteData, error: deleteError } = await supabase
              .from(table as string)
              .delete()
              .match(filters as any)
              .select();
            return { data: deleteData, error: deleteError };
          })(),
          opts.timeout
        ) as { data: T; error: any };

        if (error) throw error;
        return data as T;
      };

      const result = opts.retry
        ? await retryWithDelay(executeDelete, opts.retryCount, opts.retryDelay)
        : await executeDelete();

      // Invalidate cache for this table
      invalidateCacheForTable(table as string);

      return {
        data: result,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error(`API Delete Error in ${String(table)}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  },

  /**
   * Execute a stored procedure on the Supabase server
   * @param functionName - The name of the stored procedure to call
   * @param params - Parameters to pass to the stored procedure
   * @param options - API options (caching, retry, timeout, etc.)
   * @returns A promise that resolves to the RPC response
   */
  async rpc<T = any>(
    functionName: string,
    params: Record<string, unknown> = {},
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    const cacheKey = generateCacheKey(`rpc_${functionName}`, JSON.stringify(params), {});
    
    // Return cached data if available and valid
    if (opts.cache) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        return {
          data: cached as T,
          error: null,
          success: true,
          timestamp: Date.now(),
        };
      }
    }
    
    try {
      const executeRpc = async (): Promise<{ data: T | null; error: any }> => {
        const rpcPromise = supabase.rpc(functionName, params);
        const { data, error } = await withTimeout(
          rpcPromise.then(({ data, error }) => ({
            data: data as T,
            error
          })) as Promise<{ data: T; error: any }>,
          opts.timeout
        );
        return { data, error };
      };

      const result = await (opts.retry
        ? retryWithDelay(executeRpc, opts.retryCount, opts.retryDelay)
        : executeRpc());

      if (result.error) throw result.error;

      // Cache the successful response
      if (opts.cache && result.data) {
        setCachedData(cacheKey, result.data, opts.cacheTTL);
      }

      return {
        data: result.data as T,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error(`RPC Error in ${functionName}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }
}

// ... (rest of the code remains the same)

// Hook for using API service
export const useApiService = () => {
  return ApiService.getInstance();
};

// Specialized API methods for common operations
export const airQualityApi = {
  // Get user's air quality readings
  getUserReadings: (userId: string, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().query('air_quality_readings', '*', { user_id: userId }, options);
  },
  
  // Insert new reading
  insertReading: (reading: TableInsert<'air_quality_readings'>, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().insert('air_quality_readings', reading, options);
  },
  
  // Delete user's readings
  deleteUserReadings: (userId: string, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().delete('air_quality_readings', { user_id: userId }, options);
  },
};

export const userApi = {
  // Get user profile
  getProfile: (userId: string, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().query('profiles', '*', { id: userId }, options);
  },
  
  // Update user profile
  updateProfile: (userId: string, data: Partial<TableUpdate<'profiles'>>, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().update('profiles', data, { id: userId }, options);
  },
  
  // Get user achievements
  getAchievements: (userId: string, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().query('user_achievements', '*', { user_id: userId }, options);
  },
  
  // Get user streaks
  getStreaks: (userId: string, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().query('user_streaks', '*', { user_id: userId }, options);
  },
};

export const withdrawalApi = {
  // Get user withdrawal requests
  getUserRequests: (userId: string, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().query('withdrawal_requests', '*', { user_id: userId }, options);
  },
  
  // Create withdrawal request
  createRequest: (data: TableInsert<'withdrawal_requests'>, options?: Partial<ApiOptions>) => {
    return ApiService.getInstance().insert('withdrawal_requests', data, options);
  },
};
