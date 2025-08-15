import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useProfileValidation() {
  const { user, signOut } = useAuth();
  const [isValidating, setIsValidating] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (user && !isValidating) {
      validateProfile();
    }
  }, [user]);

  const validateProfile = async () => {
    if (!user) return;
    
    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        // Profile doesn't exist, sign out the user
        console.warn('User profile not found in database, signing out user');
        setProfileExists(false);
        await signOut();
      } else {
        setProfileExists(true);
      }
    } catch (error) {
      console.error('Error validating profile:', error);
      // If there's an error fetching profile, assume it doesn't exist and sign out
      setProfileExists(false);
      await signOut();
    } finally {
      setIsValidating(false);
    }
  };

  return {
    isValidating,
    profileExists,
    validateProfile
  };
}
