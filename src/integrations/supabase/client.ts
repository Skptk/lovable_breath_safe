import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Debug environment variables
console.log('Environment check:', {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  envUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 20) + '...' || 'not set',
  envKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'not set'
});

// Use environment variables for security, with guaranteed fallback for deployment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://bmqdbetupttlthpadseq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcWRiZXR1cHR0bHRocGFkc2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjQzNDcsImV4cCI6MjA3MDc0MDM0N30.wCHsFY73VDM93uJAWRLd4-XA_fTB7efJC7rXzsjhn8c";

// Final validation - these should never be empty now
console.log('Final values:', {
  url: SUPABASE_URL?.substring(0, 20) + '...',
  key: SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + '...',
  urlLength: SUPABASE_URL?.length,
  keyLength: SUPABASE_PUBLISHABLE_KEY?.length
});

// Log a warning if using fallback values (for development awareness)
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Using fallback Supabase credentials. For better security, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
});