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

// Environment-specific realtime configuration
const getRealtimeConfig = () => {
  const isNetlify = window.location.hostname.includes('netlify.app') || 
                   window.location.hostname.includes('netlify.com');
  const isDevelopment = window.location.hostname === 'localhost';
  
  console.log('🔍 [Config] Environment detected:', { isNetlify, isDevelopment });
  
  // CRITICAL FIX: Remove transport specification - let Supabase handle this automatically
  const baseConfig = {
    heartbeatIntervalMs: isNetlify ? 15000 : 30000, // More frequent heartbeats on Netlify
    reconnectAfterMs: (tries: number) => Math.min(tries * (isNetlify ? 2000 : 1000), isNetlify ? 30000 : 10000),
    timeout: isNetlify ? 20000 : 10000, // Longer timeout for Netlify
    params: {
      eventsPerSecond: isNetlify ? 5 : 10, // Reduce events per second on Netlify
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

// Enhanced connection diagnostics
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
diagnoseConnection();