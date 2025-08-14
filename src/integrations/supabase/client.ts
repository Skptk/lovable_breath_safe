import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for security
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://bmqdbetupttlthpadseq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcWRiZXR1cHR0bHRocGFkc2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjQzNDcsImV4cCI6MjA3MDc0MDM0N30.wCHsFY73VDM93uJAWRLd4-XA_fTB7efJC7rXzsjhn8c";

// Debug logging
console.log('Supabase Client Configuration:', {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET',
  ENV_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  ENV_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
});

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