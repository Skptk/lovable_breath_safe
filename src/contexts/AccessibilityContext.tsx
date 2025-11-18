import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type FontSize = 'small' | 'medium' | 'large';
export type HighContrast = boolean;
export type ReducedMotion = boolean;

interface AccessibilityPreferences {
  fontSize: FontSize;
  highContrast: HighContrast;
  reducedMotion: ReducedMotion;
}

interface AccessibilityContextType {
  fontSize: FontSize;
  highContrast: HighContrast;
  reducedMotion: ReducedMotion;
  setFontSize: (size: FontSize) => void;
  setHighContrast: (enabled: HighContrast) => void;
  setReducedMotion: (enabled: ReducedMotion) => void;
  resetPreferences: () => void;
}

const defaultPreferences: AccessibilityPreferences = {
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'breath-safe-accessibility';

// Font size mappings in rem
const FONT_SIZES: Record<FontSize, string> = {
  small: '0.875rem',   // 14px
  medium: '1rem',      // 16px
  large: '1.125rem',   // 18px
};

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            fontSize: ['small', 'medium', 'large'].includes(parsed.fontSize) 
              ? parsed.fontSize 
              : defaultPreferences.fontSize,
            highContrast: typeof parsed.highContrast === 'boolean' 
              ? parsed.highContrast 
              : defaultPreferences.highContrast,
            reducedMotion: typeof parsed.reducedMotion === 'boolean' 
              ? parsed.reducedMotion 
              : defaultPreferences.reducedMotion,
          };
        }
      } catch (error) {
        console.warn('Failed to load accessibility preferences:', error);
      }
    }
    return defaultPreferences;
  });

  // Apply preferences to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply font size
    root.style.setProperty('--font-size-base', FONT_SIZES[preferences.fontSize]);
    
    // Apply high contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Apply reduced motion
    if (preferences.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [preferences]);

  // Save to localStorage when preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error);
    }
  }, [preferences]);

  const setFontSize = useCallback((size: FontSize) => {
    setPreferences(prev => ({ ...prev, fontSize: size }));
  }, []);

  const setHighContrast = useCallback((enabled: HighContrast) => {
    setPreferences(prev => ({ ...prev, highContrast: enabled }));
  }, []);

  const setReducedMotion = useCallback((enabled: ReducedMotion) => {
    setPreferences(prev => ({ ...prev, reducedMotion: enabled }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize: preferences.fontSize,
        highContrast: preferences.highContrast,
        reducedMotion: preferences.reducedMotion,
        setFontSize,
        setHighContrast,
        setReducedMotion,
        resetPreferences,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

