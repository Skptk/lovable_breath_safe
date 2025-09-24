/**
 * Processes large arrays in chunks to avoid blocking the main thread
 * @param array The array to process
 * @param processFn Function to process each chunk
 * @param chunkSize Number of items per chunk
 * @param delayMs Delay between chunks to avoid blocking
 */
export async function processInChunks<T, R>(
  array: T[],
  processFn: (chunk: T[]) => Promise<R[]> | R[],
  chunkSize: number = 100,
  delayMs: number = 0
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    const chunkResults = await processFn(chunk);
    results.push(...chunkResults);
    
    // Allow the event loop to breathe between chunks
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * Creates a batched version of a function that processes arrays
 * @param processFn Function to batch
 * @param waitMs Time to wait before processing the batch
 */
export function createBatchedProcessor<T, R>(
  processFn: (items: T[]) => Promise<R[]> | R[],
  waitMs: number = 100
): (item: T) => Promise<R> {
  let queue: { item: T; resolve: (value: R) => void; reject: (error: any) => void }[] = [];
  let timeout: NodeJS.Timeout | null = null;
  
  const processBatch = async () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    
    if (queue.length === 0) return;
    
    const currentBatch = [...queue];
    queue = [];
    
    try {
      const items = currentBatch.map(entry => entry.item);
      const results = await processFn(items);
      
      currentBatch.forEach((entry, index) => {
        if (index < results.length) {
          entry.resolve(results[index]!);
        } else {
          entry.reject(new Error('Batched processor received fewer results than expected'));
        }
      });
    } catch (error) {
      currentBatch.forEach(entry => {
        entry.reject(error);
      });
    }
  };
  
  return (item: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      queue.push({ item, resolve, reject });
      
      if (!timeout) {
        timeout = setTimeout(processBatch, waitMs);
      }
      
      // Process immediately if batch size is reached
      if (queue.length >= 10) {
        processBatch();
      }
    });
  };
}

/**
 * Memoizes a function with size and time-based cache invalidation
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxSize?: number;
    ttl?: number; // Time to live in milliseconds
    cacheKey?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  const { maxSize = 100, ttl = 5 * 60 * 1000, cacheKey = JSON.stringify } = options;
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = cacheKey(args);
    const now = Date.now();
    
    // Check cache
    if (cache.has(key)) {
      const entry = cache.get(key)!;
      
      // Check if entry is still valid
      if (!ttl || now - entry.timestamp < ttl) {
        return entry.value;
      }
      
      // Remove expired entry
      cache.delete(key);
    }
    
    // Clean up if cache is full
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
    
    // Call the original function
    const result = fn(...args);
    
    // Cache the result
    cache.set(key, { value: result, timestamp: now });
    
    return result;
  }) as T;
}

/**
 * Debounces a function to limit how often it can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (this: unknown, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func.apply(this, args);
      }
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func.apply(this, args);
    }
  };
}

/**
 * Throttles a function to limit how often it can be called
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
