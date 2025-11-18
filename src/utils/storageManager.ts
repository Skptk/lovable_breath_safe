/**
 * Storage management utilities
 * Handles selective clearing of localStorage keys
 */

import { APP_STORAGE_PREFIXES } from '@/constants/defaultSettings';

/**
 * Clears all app-specific localStorage keys
 * Only removes keys that match app prefixes, preserving other data
 */
export function clearAppStorage(): {
  cleared: number;
  keys: string[];
} {
  const keysToRemove: string[] = [];
  
  // Find all keys that match app prefixes
  Object.keys(localStorage).forEach(key => {
    if (
      APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix)) ||
      key.includes('breath-safe')
    ) {
      keysToRemove.push(key);
    }
  });

  // Remove the keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  return {
    cleared: keysToRemove.length,
    keys: keysToRemove,
  };
}

/**
 * Clears only cache-prefixed localStorage keys
 */
export function clearCacheStorage(): {
  cleared: number;
  keys: string[];
} {
  const keysToRemove: string[] = [];
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('cache-') || key.includes('cache')) {
      keysToRemove.push(key);
    }
  });

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  return {
    cleared: keysToRemove.length,
    keys: keysToRemove,
  };
}

/**
 * Gets the size of localStorage in bytes (approximate)
 */
export function getStorageSize(): {
  total: number;
  app: number;
  cache: number;
} {
  let total = 0;
  let app = 0;
  let cache = 0;

  Object.keys(localStorage).forEach(key => {
    const value = localStorage.getItem(key) || '';
    const size = new Blob([key + value]).size;
    total += size;

    if (
      APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix)) ||
      key.includes('breath-safe')
    ) {
      app += size;
    }

    if (key.startsWith('cache-') || key.includes('cache')) {
      cache += size;
    }
  });

  return { total, app, cache };
}

/**
 * Formats bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

