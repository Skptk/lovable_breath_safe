import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fallback credentials for deployment
const FALLBACK_SUPABASE_URL = "https://bmqdbetupttlthpadseq.supabase.co";
const FALLBACK_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcWRiZXR1cHR0bHRocGFkc2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjQzNDcsImV4cCI6MjA3MDc0MDM0N30.wCHsFY73VDM93uJAWRLd4-XA_fTB7efJC7rXzsjhn8c";

// Get environment variables with proper fallbacks
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_KEY;

// Validation function
function validateSupabaseConfig(url: string, key: string): void {
  if (!url || url.trim() === '' || url === 'your_supabase_project_url') {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  }
  
  if (!key || key.trim() === '' || key === 'your_supabase_anon_key') {
    throw new Error('Missing Supabase environment variables. Please check your .env.local file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  }

  // Basic URL validation
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    console.warn('Supabase URL format appears incorrect. Expected format: https://your-project.supabase.co');
  }

  // Basic key validation
  if (!key.startsWith('eyJ')) {
    console.warn('Supabase anon key format appears incorrect. Expected JWT format starting with "eyJ"');
  }
}

// Validate configuration
try {
  validateSupabaseConfig(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  
  // Debug environment variables (only in development)
  if (import.meta.env.DEV) {
    console.log('Supabase configuration loaded successfully:', {
      hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      usingFallbacks: !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY,
      urlLength: SUPABASE_URL?.length,
      keyLength: SUPABASE_PUBLISHABLE_KEY?.length
    });
  }

  // Log a warning if using fallback values (for development awareness)
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Using fallback Supabase credentials. For better security, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.');
  }
} catch (error) {
  console.error('Supabase configuration error:', error);
  // In production, we want the app to fail gracefully rather than throw immediately
  if (import.meta.env.PROD) {
    console.error('Unable to initialize Supabase client. Please check your environment variables.');
  } else {
    throw error;
  }
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