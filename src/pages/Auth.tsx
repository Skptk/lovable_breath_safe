import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, EyeOff, Code, AlertTriangle, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

// Constants
const PASSWORD_MIN_LENGTH = 6;
const DEV_EMAIL = import.meta.env.VITE_DEV_EMAIL || 'dev@breathsafe.com';
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD || 'devpassword123';
const isDevelopment = import.meta.env.DEV;

// Utility Functions
const clearAuthParams = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('access_token');
  url.searchParams.delete('refresh_token');
  url.searchParams.delete('type');
  url.searchParams.delete('reset');
  window.history.replaceState({}, '', url.toString());
};

const hasRecoveryParams = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  const hasUrlParams = 
    urlParams.get('reset') === 'true' ||
    (urlParams.get('access_token') && urlParams.get('refresh_token')) ||
    urlParams.get('code') ||
    urlParams.get('type') === 'recovery';

  const hasHashParams =
    (hashParams.get('access_token') && hashParams.get('refresh_token')) ||
    hashParams.get('type') === 'recovery';

  return hasUrlParams || hasHashParams;
};

const getRecoveryTokens = (): { accessToken?: string; refreshToken?: string; code?: string } => {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  return {
    accessToken: urlParams.get('access_token') || hashParams.get('access_token') || undefined,
    refreshToken: urlParams.get('refresh_token') || hashParams.get('refresh_token') || undefined,
    code: urlParams.get('code') || undefined,
  };
};

interface FormData {
  email: string;
  password: string;
  fullName: string;
}

export default function Auth(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);

  // Password reset state
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form data
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
  });

  const [devFormData, setDevFormData] = useState({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          navigate('/dashboard?view=dashboard');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };

    checkAuth();
  }, [navigate]);

  // Handle password recovery flow from URL parameters
  useEffect(() => {
    if (hasRecoveryParams()) {
      const { code, accessToken, refreshToken } = getRecoveryTokens();

      setIsSignUp(false);
      setShowForgotPassword(false);
      setShowPasswordResetForm(true);

      if (code) {
        supabase.auth.exchangeCodeForSession(code).catch((error) => {
          console.error('Error exchanging code for session:', error);
          toast({
            title: 'Session Error',
            description: 'Failed to establish recovery session. Please try again.',
            variant: 'destructive',
          });
        });
      } else if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).catch((error) => {
          console.error('Error setting recovery session:', error);
          toast({
            title: 'Session Error',
            description: 'Failed to establish recovery session. Please try again.',
            variant: 'destructive',
          });
        });
      }
    }
  }, [toast]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        setIsSignUp(false);
        setShowForgotPassword(false);
        setShowPasswordResetForm(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Reset password reset form state
  const resetPasswordResetState = () => {
    setShowForgotPassword(false);
    setPasswordResetEmail('');
    setPasswordResetSent(false);
    setShowPasswordResetForm(false);
    setNewPassword('');
    setConfirmPassword('');
    clearAuthParams();
  };

  // Handle main form submission (sign in or sign up)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: 'Account Created!',
          description: 'Please check your email to verify your account.',
        });

        setFormData({ email: '', password: '', fullName: '' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: 'Welcome Back!',
          description: 'You have been signed in successfully.',
        });

        navigate('/dashboard?view=dashboard');
      }
    } catch (error: any) {
      console.error('Auth error:', error);

      const errorMessage = typeof error?.message === 'string'
        ? error.message
        : 'An error occurred during authentication';

      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset request
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(passwordResetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      setPasswordResetSent(true);
      toast({
        title: 'Reset Email Sent!',
        description: 'Check your email for a link to reset your password.',
      });
    } catch (error: any) {
      console.error('Password reset error:', error);

      const errorMessage = typeof error?.message === 'string'
        ? error.message
        : 'Failed to send password reset email';

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset submission
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: 'Please make sure both passwords are identical.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      toast({
        title: 'Password Too Short',
        description: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your password has been updated. You can now sign in with your new password.',
      });

      resetPasswordResetState();
    } catch (error: any) {
      console.error('Password update error:', error);

      const errorMessage = typeof error?.message === 'string'
        ? error.message
        : 'Failed to update password';

      const isSessionExpired = errorMessage.includes('Auth session missing');

      toast({
        title: isSessionExpired ? 'Reset Link Expired' : 'Error',
        description: isSessionExpired
          ? 'The password reset link has expired. Please request a new one.'
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle developer login
  const handleDevLogin = async () => {
    setIsLoading(true);

    try {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: devFormData.email,
        password: devFormData.password,
      });

      if (signInData.user) {
        toast({
          title: 'Welcome!',
          description: 'Developer login successful.',
        });
        navigate('/dashboard?view=dashboard');
        return;
      }

      // Check if account exists but email not verified
      if (typeof signInError?.message === 'string' && 
          signInError.message.includes('Email not confirmed')) {
        await supabase.auth.resend({
          type: 'signup',
          email: devFormData.email,
        }).catch(console.error);

        toast({
          title: 'Email Verification Required',
          description: 'Account exists but email is not verified. Check your email or create a new account.',
          variant: 'destructive',
        });
        return;
      }

      // Try to create account if sign in failed
      if (signInError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: devFormData.email,
          password: devFormData.password,
          options: {
            data: { full_name: 'Developer User' },
          },
        });

        if (signUpError) throw signUpError;

        toast({
          title: 'Account Created',
          description: 'Developer account created. Check your email for verification.',
        });
      }
    } catch (error: any) {
      console.error('Developer login error:', error);

      const errorMessage = typeof error?.message === 'string'
        ? error.message
        : 'An error occurred during developer login';

      toast({
        title: 'Login Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center page-padding">
        <GlassCard className="w-full max-w-md floating-card">
          {/* Header */}
          <GlassCardHeader className="text-center">
            <GlassCardTitle className="heading-lg bg-gradient-primary bg-clip-text text-transparent">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </GlassCardTitle>
            <p className="body-md text-muted-foreground">
              {isSignUp ? 'Join Air Quality Tracker' : 'Sign in to your account'}
            </p>
          </GlassCardHeader>

          <GlassCardContent>
            {/* Main Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium">
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required={isSignUp}
                    className="bg-background border-border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="bg-background border-border pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {!isSignUp && (
                <div className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
                  >
                    Forgot your password?
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            {/* Toggle Sign Up / Sign In */}
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
            </div>

            {/* Password Reset Form */}
            {showForgotPassword && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Reset your password</span>
                  </div>

                  {!passwordResetSent ? (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="resetEmail" className="text-sm font-medium text-left block">
                          Email Address
                        </label>
                        <Input
                          id="resetEmail"
                          type="email"
                          value={passwordResetEmail}
                          onChange={(e) => setPasswordResetEmail(e.target.value)}
                          required
                          className="bg-background border-border"
                          placeholder="Enter your email address"
                        />
                      </div>
                      <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Send Reset Link
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Reset email sent!</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Check your email for a link to reset your password. The link will expire in 24 hours.
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetPasswordResetState}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to sign in
                  </Button>
                </div>
              </div>
            )}

            {/* Update Password Form */}
            {showPasswordResetForm && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    <span>Set your new password</span>
                  </div>

                  <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="newPassword" className="text-sm font-medium text-left block">
                        New Password
                      </label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="bg-background border-border pr-10"
                          placeholder="Enter your new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-left block">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="bg-background border-border pr-10"
                          placeholder="Confirm your new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Update Password
                    </Button>
                  </form>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetPasswordResetState}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to sign in
                  </Button>
                </div>
              </div>
            )}

            {/* Developer Mode */}
            {isDevelopment && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Code className="h-3 w-3" />
                    <span>Development Mode</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDevLogin(!showDevLogin)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showDevLogin ? 'Hide' : 'Show'} Developer Login
                  </Button>

                  {showDevLogin && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        <span>For development only</span>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-left block">Email</label>
                          <Input
                            type="email"
                            value={devFormData.email}
                            onChange={(e) => setDevFormData({ ...devFormData, email: e.target.value })}
                            className="h-8 text-xs bg-background border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-left block">Password</label>
                          <Input
                            type="password"
                            value={devFormData.password}
                            onChange={(e) => setDevFormData({ ...devFormData, password: e.target.value })}
                            className="h-8 text-xs bg-background border-border"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDevLogin}
                        disabled={isLoading}
                        className="w-full text-xs"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        ) : (
                          <Code className="h-3 w-3 mr-2" />
                        )}
                        Developer Authentication
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}