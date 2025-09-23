interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
}

type CacheKey = string;

// Cache configuration
const CACHE_CONFIG = {
  MAX_ITEMS: 100,
  MAX_ITEM_SIZE: 1024 * 1024, // 1MB
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
};

// Cache storage with size tracking
const cache = new Map<CacheKey, CacheItem>();
let totalCacheSize = 0;

// Generate a unique cache key
const generateCacheKey = (table: string, query: string, filters: any): string => {
  return `${table}:${query}:${JSON.stringify(filters)}`;
};

// Calculate size of an object in bytes
const calculateObjectSize = (obj: any): number => {
  try {
    const jsonString = JSON.stringify(obj);
    return new TextEncoder().encode(jsonString).length;
  } catch (error) {
    console.warn('Failed to calculate object size:', error);
    return 0;
  }
};

// Check if cached item is still valid
const isCacheValid = (key: string): boolean => {
  const cached = cache.get(key);
  if (!cached) return false;
  
  const now = Date.now();
  return now - cached.timestamp < cached.ttl;
};

// Get data from cache if valid
const getCachedData = <T = any>(key: string): T | null => {
  const cached = cache.get(key);
  return cached?.data || null;
};

// Store data in cache
const setCachedData = <T = any>(
  key: string, 
  data: T, 
  ttl: number = CACHE_CONFIG.DEFAULT_TTL
): void => {
  const size = calculateObjectSize(data);
  
  // Skip caching if item is too large
  if (size > CACHE_CONFIG.MAX_ITEM_SIZE) {
    console.warn('Item too large to cache, skipping');
    return;
  }
  
  // Remove oldest items if cache is full
  while (
    totalCacheSize + size > CACHE_CONFIG.MAX_ITEMS * CACHE_CONFIG.MAX_ITEM_SIZE && 
    cache.size > 0
  ) {
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

// Clean up expired cache entries
const cleanupCache = (force: boolean = false): void => {
  const now = Date.now();
  let removedCount = 0;
  let removedSize = 0;
  
  for (const [key, item] of cache.entries()) {
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

export {
  generateCacheKey,
  isCacheValid,
  getCachedData,
  setCachedData,
  invalidateCacheForTable,
  cleanupCache,
  CACHE_CONFIG,
};

export type { CacheKey };
