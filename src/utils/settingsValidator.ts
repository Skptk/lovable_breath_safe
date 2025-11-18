/**
 * Settings validation utilities
 * Validates imported settings data structure and values
 */

import { defaultSettings, DefaultSettings } from '@/constants/defaultSettings';

export interface ExportedSettings {
  settings: DefaultSettings;
  exportDate: string;
  appVersion?: string;
  exportedFrom?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  data?: ExportedSettings;
}

/**
 * Validates the structure of imported settings
 */
export function validateSettingsStructure(data: any): ValidationResult {
  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      error: 'Invalid file format: Expected a JSON object',
    };
  }

  // Check for required fields
  if (!data.settings || typeof data.settings !== 'object') {
    return {
      isValid: false,
      error: 'Invalid file format: Missing "settings" field',
    };
  }

  if (!data.exportDate || typeof data.exportDate !== 'string') {
    return {
      isValid: false,
      error: 'Invalid file format: Missing or invalid "exportDate" field',
    };
  }

  // Validate settings structure
  const settings = data.settings;
  const errors: string[] = [];

  // Validate theme
  if (settings.theme && !['light', 'dark', 'system'].includes(settings.theme)) {
    errors.push('Invalid theme value');
  }

  // Validate language
  if (settings.language && !['en', 'es', 'fr'].includes(settings.language)) {
    errors.push('Invalid language value');
  }

  // Validate units
  if (settings.units && !['metric', 'imperial'].includes(settings.units)) {
    errors.push('Invalid units value');
  }

  // Validate dataRetention
  if (
    settings.dataRetention &&
    !['30days', '90days', '1year', 'forever'].includes(settings.dataRetention)
  ) {
    errors.push('Invalid dataRetention value');
  }

  // Validate privacy object
  if (settings.privacy) {
    if (typeof settings.privacy.shareData !== 'undefined' && typeof settings.privacy.shareData !== 'boolean') {
      errors.push('Invalid privacy.shareData value');
    }
    if (typeof settings.privacy.publicProfile !== 'undefined' && typeof settings.privacy.publicProfile !== 'boolean') {
      errors.push('Invalid privacy.publicProfile value');
    }
    if (typeof settings.privacy.locationHistory !== 'undefined' && typeof settings.privacy.locationHistory !== 'boolean') {
      errors.push('Invalid privacy.locationHistory value');
    }
  }

  // Validate location object
  if (settings.location) {
    if (typeof settings.location.autoLocation !== 'undefined' && typeof settings.location.autoLocation !== 'boolean') {
      errors.push('Invalid location.autoLocation value');
    }
    if (
      settings.location.locationAccuracy &&
      !['high', 'medium', 'low'].includes(settings.location.locationAccuracy)
    ) {
      errors.push('Invalid location.locationAccuracy value');
    }
    if (typeof settings.location.locationHistory !== 'undefined' && typeof settings.location.locationHistory !== 'boolean') {
      errors.push('Invalid location.locationHistory value');
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: `Invalid settings values: ${errors.join(', ')}`,
    };
  }

  return {
    isValid: true,
    data: data as ExportedSettings,
  };
}

/**
 * Validates and sanitizes imported settings
 * Merges valid values with defaults for missing fields
 */
export function sanitizeSettings(imported: any): DefaultSettings {
  const defaults = defaultSettings;
  const settings = imported.settings || {};

  return {
    theme: ['light', 'dark', 'system'].includes(settings.theme)
      ? settings.theme
      : defaults.theme,
    language: ['en', 'es', 'fr'].includes(settings.language)
      ? settings.language
      : defaults.language,
    units: ['metric', 'imperial'].includes(settings.units)
      ? settings.units
      : defaults.units,
    dataRetention: ['30days', '90days', '1year', 'forever'].includes(settings.dataRetention)
      ? settings.dataRetention
      : defaults.dataRetention,
    privacy: {
      shareData: typeof settings.privacy?.shareData === 'boolean'
        ? settings.privacy.shareData
        : defaults.privacy.shareData,
      publicProfile: typeof settings.privacy?.publicProfile === 'boolean'
        ? settings.privacy.publicProfile
        : defaults.privacy.publicProfile,
      locationHistory: typeof settings.privacy?.locationHistory === 'boolean'
        ? settings.privacy.locationHistory
        : defaults.privacy.locationHistory,
    },
    location: {
      autoLocation: typeof settings.location?.autoLocation === 'boolean'
        ? settings.location.autoLocation
        : defaults.location.autoLocation,
      locationAccuracy: ['high', 'medium', 'low'].includes(settings.location?.locationAccuracy)
        ? settings.location.locationAccuracy
        : defaults.location.locationAccuracy,
      locationHistory: typeof settings.location?.locationHistory === 'boolean'
        ? settings.location.locationHistory
        : defaults.location.locationHistory,
    },
  };
}

