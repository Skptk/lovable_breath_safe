import { supabase } from './supabaseClient';
import { 
  generateCacheKey, 
  getCachedData, 
  setCachedData, 
  invalidateCacheForTable,
  type CacheKey
} from './cache';
import { 
  ExtendedTableName, 
  TableRow, 
  TableInsert, 
  TableUpdate 
} from './types/tables';

// API Response type
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

// Retry logic with exponential backoff
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
    return retryWithDelay(fn, retryCount - 1, delay * 2);
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

class ApiService {
  private static instance: ApiService;
  
  private constructor() {
    // Private constructor to enforce singleton
  }
  
  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  async query<T = any, TTable extends ExtendedTableName = any>(
    table: TTable,
    query: string = '*',
    filters: Partial<TableRow<TTable>> = {},
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    const cacheKey = generateCacheKey(String(table), query, filters);
    
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
      const executeQuery = async (): Promise<T> => {
        const { data, error } = await withTimeout(
          supabase.from(String(table)).select(query).match(filters as any).then(res => ({
            data: res.data,
            error: res.error
          })),
          opts.timeout
        );

        if (error) throw error;
        return data as T;
      };

      const result = opts.retry
        ? await retryWithDelay(executeQuery, opts.retryCount, opts.retryDelay)
        : await executeQuery();

      // Cache the result if caching is enabled
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
      console.error(`API Query Error in ${String(table)}:`, error);
      
      return {
        data: null,
        error: errorMessage,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  async insert<T = any, TTable extends ExtendedTableName = any>(
    table: TTable,
    data: TableInsert<TTable> | TableInsert<TTable>[],
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeInsert = async (): Promise<T> => {
        const query = Array.isArray(data)
          ? supabase.from(String(table)).insert(data as any[])
          : supabase.from(String(table)).insert(data as any).select();
        
        const { data: result, error } = await withTimeout(
          query.then((res: any) => ({
            data: res.data,
            error: res.error
          })),
          opts.timeout
        );

        if (error) throw error;
        return result as T;
      };

      const result = opts.retry
        ? await retryWithDelay(executeInsert, opts.retryCount, opts.retryDelay)
        : await executeInsert();

      // Invalidate cache for this table
      invalidateCacheForTable(String(table));

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

  async update<T = any, TTable extends ExtendedTableName = any>(
    table: TTable,
    data: TableUpdate<TTable>,
    filters: Partial<TableRow<TTable>>,
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeUpdate = async (): Promise<T> => {
        const { data: result, error } = await withTimeout(
          supabase.from(String(table)).update(data as any).match(filters as any).select()
            .then((res: any) => ({
              data: res.data,
              error: res.error
            })),
          opts.timeout
        );

        if (error) throw error;
        return result as T;
      };

      const result = opts.retry
        ? await retryWithDelay(executeUpdate, opts.retryCount, opts.retryDelay)
        : await executeUpdate();

      // Invalidate cache for this table
      invalidateCacheForTable(String(table));

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

  async delete<T = any, TTable extends ExtendedTableName = any>(
    table: TTable,
    filters: Partial<TableRow<TTable>>,
    options: Partial<ApiOptions> = {}
  ): Promise<ApiResponse<T>> {
    const opts = { ...defaultOptions, ...options };
    
    try {
      const executeDelete = async (): Promise<T> => {
        const { data, error } = await withTimeout(
          supabase.from(String(table)).delete().match(filters as any).select()
            .then((res: any) => ({
              data: res.data,
              error: res.error
            })),
          opts.timeout
        );

        if (error) throw error;
        return data as T;
      };

      const result = opts.retry
        ? await retryWithDelay(executeDelete, opts.retryCount, opts.retryDelay)
        : await executeDelete();

      // Invalidate cache for this table
      invalidateCacheForTable(String(table));

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
  }

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
        const { data, error } = await withTimeout(
          supabase.rpc(functionName, params).then((res: any) => ({
            data: res.data,
            error: res.error
          })),
          opts.timeout
        );

        return { data, error };
      };

      const { data, error } = opts.retry
        ? await retryWithDelay(executeRpc, opts.retryCount, opts.retryDelay)
        : await executeRpc();

      if (error) throw error;

      // Cache the result if caching is enabled
      if (opts.cache && data) {
        setCachedData(cacheKey, data, opts.cacheTTL);
      }

      return {
        data: data as T,
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

export const apiService = ApiService.getInstance();
export default apiService;
