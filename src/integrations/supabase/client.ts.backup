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
  if (!url.startsWith('https://') || !url.includes('supabase.co')) {
    throw new Error('Invalid Supabase URL format. Expected https://*.supabase.co');
  }
}

// Validate configuration before creating client
validateSupabaseConfig(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Environment-specific realtime configuration with improved WebSocket handling
const getRealtimeConfig = () => {
  const isNetlify = window.location.hostname.includes('netlify.app') || 
                   window.location.hostname.includes('netlify.com');
  const isDevelopment = window.location.hostname === 'localhost';
  
  console.log('🔍 [Config] Environment detected:', { isNetlify, isDevelopment });
  
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
  
  console.log('🔧 [Config] Realtime config:', baseConfig);
  return baseConfig;
};

// Create Supabase client with environment-specific realtime config
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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

// Enhanced connection diagnostics with WebSocket error handling
export const diagnoseConnection = async (): Promise<void> => {
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
  
  // Check WebSocket endpoint specifically with better error handling
  const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket';
  console.log('🔍 [Diagnostics] Attempting WebSocket connection to:', wsUrl);
  
  try {
    const testWs = new WebSocket(wsUrl + `?apikey=${SUPABASE_PUBLISHABLE_KEY}&vsn=1.0.0`);
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      console.error('❌ [Diagnostics] WebSocket connection timeout after 10 seconds');
      testWs.close();
    }, 10000);
    
    testWs.onopen = () => {
      console.log('✅ [Diagnostics] Direct WebSocket connection successful');
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
      console.log('🔍 [Diagnostics] WebSocket closed:', event.code, event.reason);
      
      // Handle specific close codes
      switch (event.code) {
        case 1000:
          console.log('✅ [Diagnostics] WebSocket closed normally');
          break;
        case 1005:
          console.error('❌ [Diagnostics] WebSocket closed with code 1005 (no status) - this indicates a connection issue');
          console.error('🔧 [Diagnostics] Possible causes: Network timeout, server rejection, or configuration issue');
          break;
        case 1006:
          console.error('❌ [Diagnostics] WebSocket connection aborted abnormally');
          break;
        case 1015:
          console.error('❌ [Diagnostics] TLS handshake failed - SSL configuration issue');
          break;
        default:
          console.warn('⚠️ [Diagnostics] WebSocket closed with unexpected code:', event.code);
      }
    };
    
    testWs.onmessage = (event) => {
      console.log('📨 [Diagnostics] WebSocket message received:', event.data);
    };
    
  } catch (error) {
    console.error('❌ [Diagnostics] WebSocket creation failed:', error);
  }
};

// Run diagnostics on app start
diagnoseConnection();