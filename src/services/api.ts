/**
 * @deprecated Import from specific modules instead:
 * - import { apiService } from './apiService';
 * - import { airQualityApi } from './featureApis';
 * - import { supabase } from './supabaseClient';
 */

// Re-export everything from the new modular structure
export * from './apiService';
export * from './supabaseClient';
export * from './featureApis';

export { default as apiService } from './apiService';
export { default as supabase } from './supabaseClient';

// For backward compatibility
import { apiService } from './apiService';
export default apiService;
