import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { debugLog, debugError } from '@/utils/debugFlags';

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
const supabaseKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  debugError('Supabase', 'Missing environment variables', { supabaseUrl, supabaseKeyPresent: !!supabaseKey });
  throw new Error('Missing Supabase environment variables');
}

debugLog('Supabase', 'Initializing client', { url: supabaseUrl });

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

debugLog('Supabase', 'Client created successfully');

export default supabase;
