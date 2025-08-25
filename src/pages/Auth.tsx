import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, EyeOff, Code, AlertTriangle, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function Auth(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [devFormData, setDevFormData] = useState({
    email: 'dev@breathsafe.com',
    password: 'devpassword123'
  });
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate('/dashboard?view=dashboard');
      }
    };
    checkAuth();
  }, [navigate]);

  // Check for password reset URL parameter and recovery token
  useEffect(() => {
    console.log('Checking URL for recovery flow...');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);
    console.log('Hash:', window.location.hash);
    
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = urlParams.get('reset');
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const type = urlParams.get('type');
    const code = urlParams.get('code');
    
    // Also check hash fragment for tokens (Supabase sometimes puts them there)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashAccessToken = hashParams.get('access_token');
    const hashRefreshToken = hashParams.get('refresh_token');
    const hashType = hashParams.get('type');
    
    console.log('URL Parameters:', { isReset, accessToken: !!accessToken, refreshToken: !!refreshToken, type, code: !!code });
    console.log('Hash Parameters:', { hashAccessToken: !!hashAccessToken, hashRefreshToken: !!hashRefreshToken, hashType });
    
    // Check if this is a password recovery flow
    if (isReset === 'true' || (accessToken && refreshToken) || (hashAccessToken && hashRefreshToken) || type === 'recovery' || hashType === 'recovery' || code) {
      console.log('Password reset flow detected:', { 
        isReset, 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken, 
        hashAccessToken: !!hashAccessToken,
        hashRefreshToken: !!hashRefreshToken,
        type,
        hashType,
        code: !!code
      });
      
      // Hide all other forms and show only password reset form
      setIsSignUp(false);
      setShowForgotPassword(false);
      setShowPasswordResetForm(true);
      
      // If we have a code, exchange it for a session
      if (code) {
        console.log('Authorization code detected, exchanging for session...');
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (error) {
            console.error('Error exchanging code for session:', error);
          } else {
            console.log('Code exchanged successfully, session established:', data.session?.user?.id);
            // The auth state change listener should handle the session
          }
        });
      }
      // Use tokens from either query params or hash fragment
      else if (accessToken && refreshToken) {
        console.log('Setting recovery session with tokens...');
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        }).then(({ data, error }) => {
          if (error) {
            console.error('Error setting recovery session:', error);
          } else {
            console.log('Recovery session set successfully');
          }
        });
      } else {
        console.log('No recovery tokens found, but recovery flow detected');
        
        // If we detect recovery flow but no tokens, try to handle it as a recovery request
        // This might happen when Supabase redirects after processing the verification
        if (type === 'recovery' || hashType === 'recovery') {
          console.log('Recovery type detected, waiting for session...');
          // The auth state change listener should handle this
        }
      }
    } else {
      console.log('No password reset flow detected');
    }
  }, []);

  // Listen for auth state changes to handle recovery flow
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      // If we get a recovery event and have a session, show password reset form
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        console.log('Password recovery event detected, showing reset form');
        setIsSignUp(false);
        setShowForgotPassword(false);
        setShowPasswordResetForm(true);
      }
      
      // If we get a token refreshed event and it's a recovery session, show password reset form
      if (event === 'TOKEN_REFRESHED' && session?.user && window.location.hash.includes('type=recovery')) {
        console.log('Token refreshed for recovery, showing reset form');
        setIsSignUp(false);
        setShowForgotPassword(false);
        setShowPasswordResetForm(true);
      }
      
      // If we get a session and we're in recovery mode, show password reset form
      if (event === 'SIGNED_IN' && session?.user && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'))) {
        console.log('Signed in with recovery session, showing reset form');
        setIsSignUp(false);
        setShowForgotPassword(false);
        setShowPasswordResetForm(true);
      }
      
      // If we get a session and we have a code parameter (recovery flow), show password reset form
      if (event === 'SIGNED_IN' && session?.user && window.location.search.includes('code=')) {
        console.log('Signed in with recovery code, showing reset form');
        setIsSignUp(false);
        setShowForgotPassword(false);
        setShowPasswordResetForm(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });

        // Redirect to dashboard after successful login
        navigate('/dashboard?view=dashboard');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset request
  const handlePasswordReset = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(passwordResetEmail, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;

      setPasswordResetSent(true);
      toast({
        title: "Password reset email sent!",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to send password reset email',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the forgot password form
  const handleBackToSignIn = (): void => {
    setShowForgotPassword(false);
    setPasswordResetEmail('');
    setPasswordResetSent(false);
    setShowPasswordResetForm(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  // Handle actual password reset
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use the recovery flow to set the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated successfully!",
        description: "You can now sign in with your new password.",
      });

      // Reset form and show sign in
      setShowPasswordResetForm(false);
      setShowForgotPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setIsSignUp(false);
      
      // Clean up the URL by removing the recovery code parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      url.searchParams.delete('access_token');
      url.searchParams.delete('refresh_token');
      url.searchParams.delete('type');
      url.searchParams.delete('reset');
      
      // Update the URL without the recovery parameters
      window.history.replaceState({}, '', url.toString());
      console.log('URL cleaned up after successful password reset');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // If session is missing, provide better error message
      if (error.message?.includes('Auth session missing')) {
        toast({
          title: "Reset link expired",
          description: "The password reset link has expired. Please request a new one.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || 'Failed to update password',
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Developer login function - handles development authentication
  const handleDevLogin = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      const { email, password } = devFormData;
      
      // First, try to sign in with existing account
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData.user) {
        // Successfully signed in
        toast({
          title: "Developer Login Successful!",
          description: "Welcome back to development mode!",
        });
        
        // Redirect to dashboard after successful login
        navigate('/dashboard?view=dashboard');
        return;
      }

      // Log detailed error information
      if (signInError) {
        console.error('Sign in error details:', {
          message: signInError.message,
          status: signInError.status,
          name: signInError.name,
          details: signInError
        });
      }

      // If sign in failed due to unverified email, we need to handle this differently
      if (signInError?.message?.includes('Email not confirmed')) {
        // Try to resend confirmation email
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email,
        });

        if (resendError) {
          console.error('Resend error:', resendError);
        }

        toast({
          title: "Email Verification Required",
          description: "Account exists but email not verified. Check your email or try creating a new account.",
          variant: "destructive",
        });
        return;
      }

      // If sign in failed for other reasons, try to create a new account
      if (signInError) {
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: 'Developer User'
            }
          }
        });

        if (signUpError) {
          console.error('Signup error details:', {
            message: signUpError.message,
            status: signUpError.status,
            name: signUpError.name,
            details: signUpError
          });
          throw signUpError;
        }

        if (signUpData.user) {
          // Account created successfully
          toast({
            title: "Developer Account Created!",
            description: "Account created successfully. Check your email for verification.",
          });
          
          // In development, we can try to sign in without verification
          // This might work if the account is auto-confirmed
          setTimeout(async () => {
            const { error: retrySignInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (retrySignInError) {
              // Retry signin still requires verification
            }
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('Developer login error:', error);
      toast({
        title: "Developer Login Error",
        description: error.message || 'An error occurred during developer login',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Development authentication - creates a real Supabase account and handles verification
  const handleDevAuth = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      const { email, password } = devFormData;
      
      // First, try to sign in with existing account
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData.user) {
        // Successfully signed in
        toast({
          title: "Developer Login Successful!",
          description: "Welcome back to development mode!",
        });
        
        // Redirect to dashboard after successful login
        navigate('/dashboard?view=dashboard');
        return;
      }

      // If sign in failed, create a new account
      if (signInError) {
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: 'Developer User'
            }
          }
        });

        if (signUpError) {
          console.error('Signup error:', signUpError);
          throw signUpError;
        }

        if (signUpData.user) {
          // Account created successfully
          toast({
            title: "Developer Account Created!",
            description: "Account created successfully. In development, you can sign in immediately.",
          });
          
          // In development, try to sign in immediately after account creation
          // This sometimes works if the account is auto-confirmed
          const { error: immediateSignInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (immediateSignInError) {
            // If immediate sign-in fails, provide instructions
            toast({
              title: "Account Created",
              description: "Account created but requires verification. Check your email or try signing in manually.",
            });
          } else {
            toast({
              title: "Auto-Login Successful!",
              description: "Account created and signed in automatically!",
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Developer auth error:', error);
      toast({
        title: "Developer Auth Error",
        description: error.message || 'An error occurred during developer authentication',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center page-padding">
        <GlassCard className="w-full max-w-md floating-card">
        <GlassCardHeader className="text-center">
          <GlassCardTitle className="heading-lg bg-gradient-primary bg-clip-text text-transparent">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </GlassCardTitle>
          <p className="body-md text-muted-foreground">
            {isSignUp ? 'Join Air Quality Tracker' : 'Sign in to your account'}
          </p>
        </GlassCardHeader>
        
        <GlassCardContent>
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
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Forgot Password Link - Only show on sign in */}
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
          
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </div>

          {/* Forgot Password Form */}
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
                    
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
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
                  onClick={handleBackToSignIn}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Button>
              </div>
            </div>
          )}

          {/* Password Reset Form - Shows when user returns from email link */}
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
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
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
                  onClick={handleBackToSignIn}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Button>
              </div>
            </div>
          )}

          {/* Developer Login Section - Only visible in development */}
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
                      <span>Development login (creates account if needed)</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-left block">
                          Email
                        </label>
                        <Input
                          type="email"
                          value={devFormData.email}
                          onChange={(e) => setDevFormData({ ...devFormData, email: e.target.value })}
                          className="h-8 text-xs bg-background border-border"
                          placeholder="dev@breathsafe.dev"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-left block">
                          Password
                        </label>
                        <Input
                          type="password"
                          value={devFormData.password}
                          onChange={(e) => setDevFormData({ ...devFormData, password: e.target.value })}
                          className="h-8 text-xs bg-background border-border"
                          placeholder="devpassword123"
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDevAuth}
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
                    
                    <div className="text-xs text-muted-foreground text-left">
                      <div>Default: dev@breathsafe.com / devpassword123</div>
                      <div>Creates a real Supabase account for development</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
      </div>
      
      {/* Footer */}
      
    </div>
  );
}