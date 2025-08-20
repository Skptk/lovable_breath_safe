import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAllChannels } from '@/lib/realtimeClient';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileValidated, setProfileValidated] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setProfileValidated(false); // Reset profile validation when auth state changes
        setValidationAttempted(false); // Reset validation attempt flag
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  };

  const signOut = async () => {
    // Clean up all realtime channels before signing out
    cleanupAllChannels();
    
    setUser(null);
    setSession(null);
    setProfileValidated(false);
    setValidationAttempted(false);
    await supabase.auth.signOut();
  };

  const validateProfile = async () => {
    if (!user || validationAttempted) return profileValidated;
    
    try {
      setValidationAttempted(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        // Profile doesn't exist, try to initialize user data
        console.warn('User profile not found in database, attempting to initialize...');
        
        try {
          // Call the ensure_user_initialization function
          const { error: initError } = await supabase.rpc('ensure_user_initialization', {
            p_user_id: user.id
          });
          
          if (initError) {
            console.error('Failed to initialize user data:', initError);
            setProfileValidated(false);
            return false;
          } else {
            console.log('User data initialized successfully');
            // Try to validate again
            const { data: retryData, error: retryError } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', user.id)
              .single();
              
            if (retryError || !retryData) {
              console.warn('Profile still not found after initialization');
              setProfileValidated(false);
              return false;
            } else {
              setProfileValidated(true);
              return true;
            }
          }
        } catch (initError) {
          console.error('Error during user initialization:', initError);
          setProfileValidated(false);
          return false;
        }
      } else {
        setProfileValidated(true);
        return true;
      }
    } catch (error) {
      console.error('Error validating profile:', error);
      // Don't automatically sign out on error, just mark as not validated
      setProfileValidated(false);
      return false;
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signOut,
    validateProfile,
    profileValidated,
    isAuthenticated: !!user && profileValidated,
    validationAttempted
  };
}