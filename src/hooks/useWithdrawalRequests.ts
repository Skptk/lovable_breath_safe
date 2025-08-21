import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  notes?: string;
}

export const useWithdrawalRequests = () => {
  const { user } = useAuth();
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWithdrawalRequests = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWithdrawalRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching withdrawal requests:', err);
      setError(err.message || 'Failed to fetch withdrawal requests');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createWithdrawalRequest = useCallback(async (amount: number) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setWithdrawalRequests(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Error creating withdrawal request:', err);
      throw err;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchWithdrawalRequests();
    }
  }, [user, fetchWithdrawalRequests]);

  return {
    withdrawalRequests,
    isLoading,
    error,
    createWithdrawalRequest,
    fetchWithdrawalRequests
  };
};
