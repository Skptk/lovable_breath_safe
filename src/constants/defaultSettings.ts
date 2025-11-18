/**
 * Default settings for Breath Safe application
 * Single source of truth for default settings values
 */

export interface DefaultSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es' | 'fr';
  units: 'metric' | 'imperial';
  dataRetention: '30days' | '90days' | '1year' | 'forever';
  privacy: {
    shareData: boolean;
    publicProfile: boolean;
    locationHistory: boolean;
  };
  location: {
    autoLocation: boolean;
    locationAccuracy: 'high' | 'medium' | 'low';
    locationHistory: boolean;
  };
}

export const defaultSettings: DefaultSettings = {
  theme: 'system',
  language: 'en',
  units: 'metric',
  dataRetention: '90days',
  privacy: {
    shareData: false,
    publicProfile: false,
    locationHistory: true,
  },
  location: {
    autoLocation: true,
    locationAccuracy: 'high',
    locationHistory: true,
  },
};

/**
 * App-specific localStorage key prefixes
 * Used for selective clearing of localStorage
 */
export const APP_STORAGE_PREFIXES = [
  'breath-safe-app-settings',
  'breath-safe-store',
  'breath-safe-cache',
  'breath-safe-',
] as const;

/**
 * Maximum file size for settings import (5MB)
 */
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

