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

  // Basic key validation
  if (!key.startsWith('eyJ')) {
    throw new Error('Invalid Supabase anon key format. Expected JWT format starting with "eyJ"');
  }
}

// Validate configuration and fail fast
try {
  validateSupabaseConfig(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
} catch (error) {
  console.error('Supabase configuration error:', error);
  // Fail fast in all environments - no fallbacks
  throw new Error(`Supabase configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
});