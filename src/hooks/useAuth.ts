import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileValidated, setProfileValidated] = useState(false);

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
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setProfileValidated(false);
    await supabase.auth.signOut();
  };

  const validateProfile = async () => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        // Profile doesn't exist, sign out the user
        console.warn('User profile not found in database, signing out user');
        await signOut();
        return false;
      } else {
        setProfileValidated(true);
        return true;
      }
    } catch (error) {
      console.error('Error validating profile:', error);
      // If there's an error fetching profile, assume it doesn't exist and sign out
      await signOut();
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
    isAuthenticated: !!user && profileValidated
  };
}