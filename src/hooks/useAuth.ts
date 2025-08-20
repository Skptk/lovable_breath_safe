import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAllChannels, destroyRealtimeManager } from '@/lib/realtimeClient';

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
        console.log('Auth state change:', event, session?.user?.id);
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
    try {
      console.log('[Auth] Starting sign out process...');
      
      // First, clean up all realtime channels
      console.log('[Auth] Cleaning up realtime channels...');
      cleanupAllChannels();
      
      // Reset local state immediately to prevent further operations
      setUser(null);
      setSession(null);
      setProfileValidated(false);
      setValidationAttempted(false);
      
      // Sign out from Supabase
      console.log('[Auth] Signing out from Supabase...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[Auth] Error during sign out:', error);
        throw error;
      }
      
      console.log('[Auth] Sign out completed successfully');
      
      // Destroy realtime manager to prevent any further operations
      destroyRealtimeManager();
      
    } catch (error) {
      console.error('[Auth] Error during sign out:', error);
      // Even if there's an error, ensure local state is cleared
      setUser(null);
      setSession(null);
      setProfileValidated(false);
      setValidationAttempted(false);
      throw error;
    }
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