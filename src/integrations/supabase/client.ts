import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isDebugBuild } from '@/utils/debugFlags';

// Get environment variables with better error handling
const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'];
const SUPABASE_PUBLISHABLE_KEY = import.meta.env['VITE_SUPABASE_ANON_KEY'];

// Enhanced validation function with detailed logging
function validateSupabaseConfig(url: string | undefined, key: string | undefined): { isValid: boolean; error?: string } {
  if (isDebugBuild || import.meta.env.DEV) {
    console.log('🔍 [Supabase Config] Validating environment variables...');
    console.log('  - VITE_SUPABASE_URL:', url ? '✅ Set' : '❌ Missing');
    console.log('  - VITE_SUPABASE_ANON_KEY:', key ? '✅ Set' : '❌ Missing');
  }
  
  if (!url || url.trim() === '') {
    const error = 'Missing VITE_SUPABASE_URL environment variable. Please set it in Netlify dashboard under Site Settings > Environment Variables.';
    console.error('❌ [Supabase Config]', error);
    return { isValid: false, error };
  }
  
  if (!key || key.trim() === '') {
    const error = 'Missing VITE_SUPABASE_ANON_KEY environment variable. Please set it in Netlify dashboard under Site Settings > Environment Variables.';
    console.error('❌ [Supabase Config]', error);
    return { isValid: false, error };
  }

  // Basic URL validation
  if (!url.startsWith('https://') || !url.includes('supabase.co')) {
    const error = 'Invalid Supabase URL format. Expected https://*.supabase.co format.';
    console.error('❌ [Supabase Config]', error);
    return { isValid: false, error };
  }
  
  if (isDebugBuild || import.meta.env.DEV) {
    console.log('✅ [Supabase Config] Environment variables are valid');
  }
  return { isValid: true };
}

// Validate configuration with graceful error handling
const configValidation = validateSupabaseConfig(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Create a fallback client for development/demo purposes
const createFallbackClient = () => {
  console.warn('⚠️ [Supabase] Creating fallback client - some features may not work');
  return createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      realtime: {
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: () => 5000,
        timeout: 10000,
      }
    }
  );
};

// Environment-specific realtime configuration with improved WebSocket handling
const getRealtimeConfig = () => {
  const isNetlify = typeof window !== 'undefined' && (
    window.location.hostname.includes('netlify.app') || 
    window.location.hostname.includes('netlify.com')
  );
  const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  if (isDebugBuild || import.meta.env.DEV) {
    console.log('🔍 [Config] Environment detected:', { isNetlify, isDevelopment });
  }
  
  // IMPROVED CONFIG: Better WebSocket connection handling and postgres_changes configuration
  const baseConfig = {
    heartbeatIntervalMs: isNetlify ? 15000 : 30000, // More frequent heartbeats on Netlify
    reconnectAfterMs: (tries: number) => {
      // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s, 30s (max)
      const baseDelay = Math.min(1000 * Math.pow(2, tries), 30000);
      const jitter = Math.random() * 1000; // Add 0-1s random jitter
      return baseDelay + jitter;
    },
    timeout: isNetlify ? 25000 : 15000, // Longer timeout for Netlify
    params: {
      eventsPerSecond: isNetlify ? 5 : 10, // Reduce events per second on Netlify
      // Fix: Ensure proper postgres_changes configuration
      postgres_changes: {
        // Enable postgres_changes for real-time database updates
        enabled: true,
        // Ensure proper schema and table binding
        schema: 'public',
        // Add proper event filtering
        events: ['INSERT', 'UPDATE', 'DELETE']
      }
    }
  };
  
  if (isDebugBuild || import.meta.env.DEV) {
    console.log('🔧 [Config] Realtime config:', baseConfig);
  }
  return baseConfig;
};

// Create Supabase client with error handling
let supabase: ReturnType<typeof createClient<Database>>;
let supabaseError: string | null = null;

if (configValidation.isValid) {
  try {
    supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      realtime: getRealtimeConfig(),
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    if (isDebugBuild || import.meta.env.DEV) {
      console.log('✅ [Supabase] Client created successfully');
    }
  } catch (error) {
    console.error('❌ [Supabase] Failed to create client:', error);
    supabaseError = `Failed to create Supabase client: ${error}`;
    supabase = createFallbackClient();
  }
} else {
  console.error('❌ [Supabase] Invalid configuration, using fallback client');
  supabaseError = configValidation.error || 'Invalid Supabase configuration';
  supabase = createFallbackClient();
}

// Export the client and error state
export { supabase, supabaseError };

// Enhanced connection diagnostics with WebSocket error handling
export const diagnoseConnection = async (): Promise<void> => {
  if (supabaseError) {
    console.error('❌ [Diagnostics] Skipping diagnostics due to configuration error:', supabaseError);
    return;
  }
  
  if (isDebugBuild || import.meta.env.DEV) {
    console.log('🔍 [Diagnostics] Starting WebSocket connection diagnosis...');
  }
  
  // Check if Supabase URL is accessible
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY! }
    });
    if (isDebugBuild || import.meta.env.DEV) {
      console.log('✅ [Diagnostics] REST API accessible:', response.status);
    }
  } catch (error) {
    console.error('❌ [Diagnostics] REST API failed:', error);
  }
  
  // Check WebSocket endpoint specifically with better error handling
  const wsUrl = SUPABASE_URL!.replace('https://', 'wss://') + '/realtime/v1/websocket';
  if (isDebugBuild || import.meta.env.DEV) {
    console.log('🔍 [Diagnostics] Attempting WebSocket connection to:', wsUrl);
  }
  
  try {
    const testWs = new WebSocket(wsUrl + `?apikey=${SUPABASE_PUBLISHABLE_KEY}&vsn=1.0.0`);
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      console.error('❌ [Diagnostics] WebSocket connection timeout after 10 seconds');
      testWs.close();
    }, 10000);
    
    testWs.onopen = () => {
      if (isDebugBuild || import.meta.env.DEV) {
        console.log('✅ [Diagnostics] Direct WebSocket connection successful');
      }
      clearTimeout(connectionTimeout);
      
      // Send a ping to test connection health
      testWs.send(JSON.stringify({ type: 'ping' }));
      
      // Close after successful test
      setTimeout(() => testWs.close(), 2000);
    };
    
    testWs.onerror = (error) => {
      console.error('❌ [Diagnostics] Direct WebSocket connection failed:', error);
      clearTimeout(connectionTimeout);
    };
    
    testWs.onclose = (event) => {
      clearTimeout(connectionTimeout);
      
      // Handle specific close codes with appropriate logging levels
      switch (event.code) {
        case 1000:
          console.log('✅ [Diagnostics] WebSocket closed normally');
          break;
        case 1005:
          console.warn('⚠️ [Diagnostics] WebSocket closed with code 1005 (no status) - connection issue');
          break;
        case 1006:
          console.warn('⚠️ [Diagnostics] WebSocket connection aborted abnormally');
          break;
        case 1011:
          // Suppress noisy 1011 errors - this is a known Supabase issue
          console.log('🔍 [Diagnostics] WebSocket closed with code 1011 (server endpoint going away) - known Supabase issue');
          break;
        case 1015:
          console.error('❌ [Diagnostics] TLS handshake failed - SSL configuration issue');
          break;
        default:
          console.log('🔍 [Diagnostics] WebSocket closed with code:', event.code, event.reason);
      }
    };
    
    testWs.onmessage = (event) => {
      if (isDebugBuild || import.meta.env.DEV) {
        console.log('📨 [Diagnostics] WebSocket message received:', event.data);
      }
    };
    
  } catch (error) {
    console.error('❌ [Diagnostics] WebSocket creation failed:', error);
  }
};

// Run diagnostics on app start only if configuration is valid
if (configValidation.isValid && (isDebugBuild || import.meta.env.DEV)) {
  diagnoseConnection();
}

// Export a function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return configValidation.isValid && !supabaseError;
};

// Export the error message for UI display
export const getSupabaseErrorMessage = (): string | null => {
  return supabaseError;
};
