import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables - fail fast if missing
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation function
function validateSupabaseConfig(url: string | undefined, key: string | undefined): void {
  if (!url || url.trim() === '') {
    throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL in Netlify.');
  }
  
  if (!key || key.trim() === '') {
    throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_ANON_KEY in Netlify.');
  }

  // Basic URL validation
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('Invalid Supabase URL format. Expected: https://your-project.supabase.co');
  }
}

// Environment detection and appropriate configuration
const getRealtimeConfig = () => {
  const isNetlify = window.location.hostname.includes('netlify.app') || 
                   window.location.hostname.includes('netlify.com');
  const isDevelopment = window.location.hostname === 'localhost';
  
  console.log('🔍 [Config] Environment detected:', { isNetlify, isDevelopment });
  
  if (isNetlify) {
    return {
      transport: 'websocket', // Force WebSocket transport
      heartbeatIntervalMs: 15000, // More frequent heartbeats on Netlify
      reconnectAfterMs: (tries: number) => Math.min(tries * 2000, 30000),
      timeout: 20000, // Longer timeout for Netlify
      params: {
        eventsPerSecond: 5, // Reduce events per second on Netlify
      }
    };
  }
  
  // Default configuration for other environments
  return {
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
    timeout: 10000,
    params: {
      eventsPerSecond: 10,
    }
  };
};

// WebSocket connection diagnostics
const diagnoseConnection = async () => {
  console.log('🔍 [Diagnostics] Starting WebSocket connection diagnosis...');
  
  // Check if Supabase URL is accessible
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY }
    });
    console.log('✅ [Diagnostics] REST API accessible:', response.status);
  } catch (error) {
    console.error('❌ [Diagnostics] REST API failed:', error);
  }
  
  // Check WebSocket endpoint specifically
  const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket';
  console.log('🔍 [Diagnostics] Attempting WebSocket connection to:', wsUrl);
  
  try {
    const testWs = new WebSocket(wsUrl + `?apikey=${SUPABASE_PUBLISHABLE_KEY}&vsn=1.0.0`);
    
    testWs.onopen = () => {
      console.log('✅ [Diagnostics] Direct WebSocket connection successful');
      testWs.close();
    };
    
    testWs.onerror = (error) => {
      console.error('❌ [Diagnostics] Direct WebSocket connection failed:', error);
    };
    
    testWs.onclose = (event) => {
      console.log('🔍 [Diagnostics] WebSocket closed:', event.code, event.reason);
    };
  } catch (error) {
    console.error('❌ [Diagnostics] WebSocket creation failed:', error);
  }
};

// Run diagnostics on app start
if (typeof window !== 'undefined') {
  // Run diagnostics after a short delay to ensure app is loaded
  setTimeout(() => {
    diagnoseConnection();
  }, 2000);
}

// Validate configuration before creating client
validateSupabaseConfig(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Create singleton Supabase client
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    console.log('🔧 Creating Supabase client instance with enhanced connection settings...');
    
    // Get environment-specific realtime configuration
    const realtimeConfig = getRealtimeConfig();
    
    // Create configuration object with enhanced WebSocket stability settings
    const clientConfig = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'supabase.auth.token'
      },
      realtime: realtimeConfig,
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': 'breath-safe-app'
        }
      }
    };
    
    supabaseInstance = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      clientConfig
    );
    console.log('✅ Supabase client instance created with enhanced WebSocket settings');
    console.log('🔧 [Config] Applied realtime configuration:', realtimeConfig);
  }
  return supabaseInstance;
}

// Export the singleton instance
export const supabase = getSupabaseClient();

// Export a function to reset the instance (useful for testing)
export function resetSupabaseClient() {
  if (supabaseInstance) {
    console.log('🔄 Resetting Supabase client instance...');
    supabaseInstance = null;
  }
}

// Export diagnostics function for manual testing
export { diagnoseConnection };