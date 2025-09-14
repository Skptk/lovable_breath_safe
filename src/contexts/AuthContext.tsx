import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  profileValidated: boolean;
  validationAttempted: boolean;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  validateProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileValidated, setProfileValidated] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  
  // Use refs to prevent duplicate auth state changes
  const lastAuthEvent = useRef<string | null>(null);
  const lastUserId = useRef<string | null>(null);
  const authListenerRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Get initial session
  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Track initial session
          if (session?.user?.id) {
            lastUserId.current = session.user.id;
            lastAuthEvent.current = 'INITIAL_SESSION';
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Set up auth state change listener (ONCE)
  useEffect(() => {
    // Only set up listener if we don't already have one
    if (authListenerRef.current) {
      console.log('Auth listener already exists, skipping setup');
      return;
    }

    console.log('🔐 Setting up auth state change listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const userId = session?.user?.id;
        
        // Prevent duplicate INITIAL_SESSION events for the same user
        if (event === 'INITIAL_SESSION' && 
            lastAuthEvent.current === 'INITIAL_SESSION' && 
            lastUserId.current === userId) {
          console.log('Auth state change: Skipping duplicate INITIAL_SESSION for user:', userId);
          return;
        }
        
        // Prevent duplicate events for the same user and event type
        if (lastAuthEvent.current === event && lastUserId.current === userId) {
          console.log('Auth state change: Skipping duplicate event:', event, 'for user:', userId);
          return;
        }
        
        console.log('Auth state change:', event, 'for user:', userId);
        
        // Update state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Track this event
        lastAuthEvent.current = event;
        lastUserId.current = userId;
        
        // Handle specific events
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setProfileValidated(false);
            setValidationAttempted(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfileValidated(false);
          setValidationAttempted(false);
        }
        
        // Update loading state
        if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    // Store the subscription for cleanup
    authListenerRef.current = subscription;

    // Cleanup function
    return () => {
      if (authListenerRef.current) {
        console.log('🔐 Cleaning up auth state change listener...');
        authListenerRef.current.unsubscribe();
        authListenerRef.current = null;
      }
    };
  }, []);

  // Profile validation function
  const validateProfile = useCallback(async () => {
    if (!user || validationAttempted) {
      return;
    }

    try {
      setValidationAttempted(true);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              total_points: 0
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            return;
          }
          
          setProfileValidated(true);
          console.log('Profile created and validated');
        } else {
          console.error('Error fetching profile:', error);
        }
      } else {
        setProfileValidated(true);
        console.log('Profile validated');
      }
    } catch (error) {
      console.error('Error in validateProfile:', error);
    }
  }, [user, validationAttempted]);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      console.log('🔐 Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        console.log('✅ Signed out successfully');
      }
    } catch (error) {
      console.error('Error in signOut:', error);
    }
  }, []);

  // Sign up function
  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      console.log('🔐 Signing up user:', email);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || ''
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('Error signing up:', error);
        throw error;
      } else {
        console.log('✅ Signed up successfully');
      }
    } catch (error) {
      console.error('Error in signUp:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    profileValidated,
    validationAttempted,
    signOut,
    signUp,
    validateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
