import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Cache State
  cache: {
    [key: string]: {
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
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
  cache: {},
};

// Create store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
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
            cache: {},
          });
        },
        
        // Air Quality Actions
        setCurrentAQI: (aqi) => set({ currentAQI: aqi }),
        setCurrentLocation: (location) => set({ currentLocation: location }),
        setLastReading: (reading) => set({ lastReading: reading }),
        
        // Cache Actions
        setCache: (key, data, ttl = 5 * 60 * 1000) => {
          const { cache } = get();
          set({
            cache: {
              ...cache,
              [key]: {
                data,
                timestamp: Date.now(),
                ttl,
              },
            },
          });
        },
        
        getCache: (key) => {
          const { cache } = get();
          const cached = cache[key];
          
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
            const newCache = { ...cache };
            delete newCache[key];
            set({ cache: newCache });
          } else {
            set({ cache: {} });
          }
        },
        
        clearExpiredCache: () => {
          const { cache } = get();
          const now = Date.now();
          const newCache = { ...cache };
          
          Object.keys(newCache).forEach((key) => {
            const cached = newCache[key];
            if (now - cached.timestamp > cached.ttl) {
              delete newCache[key];
            }
          });
          
          set({ cache: newCache });
        },
      }),
      {
        name: 'breath-safe-store',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          currentLocation: state.currentLocation,
        }),
      }
    ),
    {
      name: 'breath-safe-store',
    }
  )
);

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useProfile = () => useAppStore((state) => state.profile);
export const useLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useCurrentAQI = () => useAppStore((state) => state.currentAQI);
export const useCurrentLocation = () => useAppStore((state) => state.currentLocation);
export const useLastReading = () => useAppStore((state) => state.lastReading);
