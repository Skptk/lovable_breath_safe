import { ApiResponse } from './apiService';
import { TableInsert } from './types/tables';
import { apiService } from './apiService';

// Air Quality API
export const airQualityApi = {
  // Get user's air quality readings
  getUserReadings: (userId: string, options?: Parameters<typeof apiService.query>[3]) => {
    return apiService.query('air_quality_readings', '*', { user_id: userId }, options);
  },
  
  // Insert new reading
  insertReading: (reading: TableInsert<'air_quality_readings'>, options?: Parameters<typeof apiService.insert>[2]) => {
    return apiService.insert('air_quality_readings', reading, options);
  },
  
  // Delete user's readings
  deleteUserReadings: (userId: string, options?: Parameters<typeof apiService.delete>[2]) => {
    return apiService.delete('air_quality_readings', { user_id: userId }, options);
  },
};

// User API
export const userApi = {
  // Get user profile
  getProfile: (userId: string, options?: Parameters<typeof apiService.query>[3]): Promise<ApiResponse<any>> => {
    return apiService.query('profiles', '*', { id: userId }, options);
  },
  
  // Update user profile
  updateProfile: (
    userId: string, 
    data: Partial<TableInsert<'profiles'>>, 
    options?: Parameters<typeof apiService.update>[3]
  ): Promise<ApiResponse> => {
    return apiService.update('profiles', data, { id: userId }, options);
  },
  
  // Get user achievements
  getAchievements: (userId: string, options?: Parameters<typeof apiService.query>[3]): Promise<ApiResponse> => {
    return apiService.query('user_achievements', '*', { user_id: userId }, options);
  },
  
  // Get user streaks
  getStreaks: (userId: string, options?: Parameters<typeof apiService.query>[3]): Promise<ApiResponse> => {
    return apiService.query('user_streaks', '*', { user_id: userId }, options);
  },
};

// Withdrawal API
export const withdrawalApi = {
  // Get user withdrawal requests
  getUserRequests: (userId: string, options?: Parameters<typeof apiService.query>[3]): Promise<ApiResponse> => {
    return apiService.query('withdrawal_requests', '*', { user_id: userId }, options);
  },
  
  // Create withdrawal request
  createRequest: (
    data: TableInsert<'withdrawal_requests'>, 
    options?: Parameters<typeof apiService.insert>[2]
  ): Promise<ApiResponse> => {
    return apiService.insert('withdrawal_requests', data, options);
  },
};

export default {
  airQualityApi,
  userApi,
  withdrawalApi,
};
