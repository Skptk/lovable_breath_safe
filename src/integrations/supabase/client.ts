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

// Validate configuration before creating client
validateSupabaseConfig(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Create singleton Supabase client
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    console.log('🔧 Creating Supabase client instance...');
    supabaseInstance = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );
    console.log('✅ Supabase client instance created');
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