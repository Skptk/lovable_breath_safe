import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { LRUCache } from '@/lib/lru';
import { createSafeInterval, CancelSafeInterval } from '@/utils/safeTimers';

// Types
export interface AppState {
  // UI State
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  
  // User State
  user: any | null;
  profile: any | null;
  
  // Air Quality State
  currentAQI: number | null;
  currentLocation: string | null;
  lastReading: any | null;
  
  // Cache State - Using LRU cache
  cache: LRUCache;
}

export interface AppActions {
  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  clearError: () => void;
  
  // User Actions
  setUser: (user: any | null) => void;
  setProfile: (profile: any | null) => void;
  logout: () => void;
  
  // Air Quality Actions
  setCurrentAQI: (aqi: number | null) => void;
  setCurrentLocation: (location: string | null) => void;
  setLastReading: (reading: any | null) => void;
  
  // Cache Actions
  setCache: (key: string, data: any, ttl?: number) => void;
  getCache: (key: string) => any | null;
  clearCache: (key?: string) => void;
  clearExpiredCache: () => void;
}

export type AppStore = AppState & AppActions;

// Initial state
const initialState: AppState = {
  isLoading: false,
  error: null,
  sidebarOpen: false,
  user: null,
  profile: null,
  currentAQI: null,
  currentLocation: null,
  lastReading: null,
  cache: new LRUCache(100), // Initialize LRU cache with a size of 100
};

// Create store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        // Ensure cache is always a proper LRU instance
        cache: new LRUCache(100),
        
        // UI Actions
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        clearError: () => set({ error: null }),
        
        // User Actions
        setUser: (user) => set({ user }),
        setProfile: (profile) => set({ profile }),
        logout: () => {
          supabase.auth.signOut();
          set({
            user: null,
            profile: null,
            currentAQI: null,
            currentLocation: null,
            lastReading: null,
            cache: new LRUCache(100), // Reset cache on logout
          });
        },
        
        // Air Quality Actions
        setCurrentAQI: (aqi) => set({ currentAQI: aqi }),
        setCurrentLocation: (location) => set({ currentLocation: location }),
        setLastReading: (reading) => set({ lastReading: reading }),
        
        // Cache Actions
        setCache: (key, data, ttl = 5 * 60 * 1000) => {
          const { cache } = get();
          cache.set(key, { data, timestamp: Date.now(), ttl });
        },
        
        getCache: (key) => {
          const { cache } = get();
          const cached = cache.get(key);
          
          if (!cached) return null;
          
          const isExpired = Date.now() - cached.timestamp > cached.ttl;
          if (isExpired) {
            get().clearCache(key);
            return null;
          }
          
          return cached.data;
        },
        
        clearCache: (key) => {
          const { cache } = get();
          if (key) {
            cache.delete(key);
          } else {
            cache.clear();
          }
        },
        
        clearExpiredCache: () => {
          const { cache } = get();
          cache.clearExpired();
        },
      }),
      {
        name: 'breath-safe-store',
        partialize: (state) => ({
          // Pick only what must survive reloads
          user: state.user,
          profile: state.profile,
          currentLocation: state.currentLocation,
          // EXCLUDE: cache, lastReading, error, isLoading, etc.
        }),
        onRehydrateStorage: () => (state) => {
          // Reinitialize cache after rehydration since it's not persisted
          if (state) {
            state.cache = new LRUCache(100);
          }
        },
      }
    ),
    {
      name: 'breath-safe-store',
    }
  )
);

let maintenanceScheduler: CancelSafeInterval | null = null;

export const initializeStoreMaintenance = () => {
  if (typeof window === 'undefined') {
    return;
  }
  if (maintenanceScheduler) {
    return;
  }

  maintenanceScheduler = createSafeInterval(() => {
    const { clearExpiredCache } = useAppStore.getState();
    clearExpiredCache();
  }, 5 * 60 * 1000, {
    pauseWhenHidden: true,
  });
};

export const stopStoreMaintenance = () => {
  maintenanceScheduler?.();
  maintenanceScheduler = null;
};

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useProfile = () => useAppStore((state) => state.profile);
export const useLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useCurrentAQI = () => useAppStore((state) => state.currentAQI);
export const useCurrentLocation = () => useAppStore((state) => state.currentLocation);
export const useLastReading = () => useAppStore((state) => state.lastReading);
