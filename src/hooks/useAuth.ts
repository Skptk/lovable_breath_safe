import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  const signOut = async () => {
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
        // Profile doesn't exist, but don't automatically sign out
        // Let the user handle this situation
        console.warn('User profile not found in database');
        setProfileValidated(false);
        return false;
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
    signOut,
    validateProfile,
    profileValidated,
    isAuthenticated: !!user && profileValidated,
    validationAttempted
  };
}