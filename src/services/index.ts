// Core
import { supabase } from './supabaseClient';
import { apiService } from './apiService';

// Feature APIs
import { airQualityApi, userApi, withdrawalApi } from './featureApis';

// Types
export type { ApiResponse, ApiOptions } from './apiService';

export {
  // Core
  supabase,
  apiService,
  
  // Feature APIs
  airQualityApi,
  userApi,
  withdrawalApi,
};

export default {
  // Core
  supabase,
  apiService,
  
  // Feature APIs
  airQualityApi,
  userApi,
  withdrawalApi,
};
