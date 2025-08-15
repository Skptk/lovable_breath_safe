import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store';

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

// Cache storage
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

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

const setCachedData = (key: string, data: any, ttl: number): void => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

const clearExpiredCache = (): void => {
  const now = Date.now();
  for (const [key, cached] of cache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      cache.delete(key);
    }
  }
};

// Retry logic
const retryWithDelay = async <T>(
  fn: () => Promise<T>,
  retryCount: number,
  delay: number
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithDelay(fn, retryCount - 1, delay * 2);
    }
    throw error;
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

// Main API service class
export class ApiService {
  private static instance: ApiService;
  
  private constructor() {
    // Clear expired cache every 5 minutes
    setInterval(clearExpiredCache, 5 * 60 * 1000);
  }
  
  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Generic query method
  async query<T>(
    table: string,
    query: string,
    filters: any = {},
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    const cacheKey = generateCacheKey(table, query, filters);
    
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
      const executeQuery = async () => {
        const { data, error } = await withTimeout(
          supabase.from(table).select(query).match(filters),
          opts.timeout
        );

        if (error) throw error;
        return data;
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
      console.error(`API Error in ${table}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  // Insert method
  async insert<T>(
    table: string,
    data: any,
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeInsert = async () => {
        const { data: result, error } = await withTimeout(
          supabase.from(table).insert(data).select(),
          opts.timeout
        );

        if (error) throw error;
        return result;
      };

      const result = opts.retry
        ? await retryWithDelay(executeInsert, opts.retryCount, opts.retryDelay)
        : await executeInsert();

      // Clear cache for this table
      this.clearTableCache(table);

      return {
        data: result,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Insert failed';
      
      console.error(`Insert Error in ${table}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  // Update method
  async update<T>(
    table: string,
    data: any,
    filters: any,
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeUpdate = async () => {
        const { data: result, error } = await withTimeout(
          supabase.from(table).update(data).match(filters).select(),
          opts.timeout
        );

        if (error) throw error;
        return result;
      };

      const result = opts.retry
        ? await retryWithDelay(executeUpdate, opts.retryCount, opts.retryDelay)
        : await executeUpdate();

      // Clear cache for this table
      this.clearTableCache(table);

      return {
        data: result,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Update failed';
      
      console.error(`Update Error in ${table}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  // Delete method
  async delete<T>(
    table: string,
    filters: any,
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeDelete = async () => {
        const { data: result, error } = await withTimeout(
          supabase.from(table).delete().match(filters).select(),
          opts.timeout
        );

        if (error) throw error;
        return result;
      };

      const result = opts.retry
        ? await retryWithDelay(executeDelete, opts.retryCount, opts.retryDelay)
        : await executeDelete();

      // Clear cache for this table
      this.clearTableCache(table);

      return {
        data: result,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Delete failed';
      
      console.error(`Delete Error in ${table}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  // RPC method
  async rpc<T>(
    functionName: string,
    params: any = {},
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeRpc = async () => {
        const { data, error } = await withTimeout(
          supabase.rpc(functionName, params),
          opts.timeout
        );

        if (error) throw error;
        return data;
      };

      const result = opts.retry
        ? await retryWithDelay(executeRpc, opts.retryCount, opts.retryDelay)
        : await executeRpc();

      return {
        data: result,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'RPC call failed';
      
      console.error(`RPC Error in ${functionName}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  // Cache management methods
  clearTableCache(table: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(`${table}:`)) {
        cache.delete(key);
      }
    }
  }

  clearAllCache(): void {
    cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();

// Hook for using API service
export const useApiService = () => {
  return apiService;
};

// Specialized API methods for common operations
export const airQualityApi = {
  // Get user's air quality readings
  getUserReadings: (userId: string, options?: Partial<ApiOptions>) =>
    apiService.query('air_quality_readings', '*', { user_id: userId }, options),
  
  // Insert new reading
  insertReading: (reading: any, options?: Partial<ApiOptions>) =>
    apiService.insert('air_quality_readings', reading, options),
  
  // Delete user's readings
  deleteUserReadings: (userId: string, options?: Partial<ApiOptions>) =>
    apiService.delete('air_quality_readings', { user_id: userId }, options),
};

export const userApi = {
  // Get user profile
  getProfile: (userId: string, options?: Partial<ApiOptions>) =>
    apiService.query('profiles', '*', { user_id: userId }, options),
  
  // Update user profile
  updateProfile: (userId: string, data: any, options?: Partial<ApiOptions>) =>
    apiService.update('profiles', data, { user_id: userId }, options),
  
  // Get user achievements
  getAchievements: (userId: string, options?: Partial<ApiOptions>) =>
    apiService.query('user_achievements', '*, achievement:achievements(*)', { user_id: userId }, options),
  
  // Get user streaks
  getStreaks: (userId: string, options?: Partial<ApiOptions>) =>
    apiService.query('user_streaks', '*', { user_id: userId }, options),
};

export const withdrawalApi = {
  // Get user withdrawal requests
  getUserRequests: (userId: string, options?: Partial<ApiOptions>) =>
    apiService.query('withdrawal_requests', '*', { user_id: userId }, options),
  
  // Create withdrawal request
  createRequest: (data: any, options?: Partial<ApiOptions>) =>
    apiService.insert('withdrawal_requests', data, options),
};
