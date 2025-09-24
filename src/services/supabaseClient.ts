import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { debugLog, debugError } from '@/utils/debugFlags';
import { debugTracker } from '@/utils/errorTracker';

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
const supabaseKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

const shouldTrack = typeof __TRACK_VARIABLES__ === 'undefined' || __TRACK_VARIABLES__;

if (!supabaseUrl || !supabaseKey) {
  debugError('Supabase', 'Missing environment variables', { supabaseUrl, supabaseKeyPresent: !!supabaseKey });
  throw new Error('Missing Supabase environment variables');
}

debugLog('Supabase', 'Initializing client', { url: supabaseUrl });
console.log('🔗 [SUPABASE] Initializing client at:', new Date().toISOString());

if (shouldTrack) {
  debugTracker.trackVariableDeclaration('supabaseClient', 'initializing', 'supabaseClient.ts:init');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

debugLog('Supabase', 'Client created successfully');
console.log('🔗 [SUPABASE] Client created successfully');

if (shouldTrack) {
  debugTracker.trackVariableDeclaration('supabaseClient', supabase, 'supabaseClient.ts:created');
  debugTracker.trackVariableAccess('supabaseClient', 'supabaseClient.ts:export');
}

export default supabase;
