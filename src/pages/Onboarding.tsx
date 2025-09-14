import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  MapPin, 
  Shield, 
  TrendingUp,
  Award,
  Users,
  Mail,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface OnboardingData {
  email: string;
  password: string;
  confirmPassword: string;
  region: string;
  city: string;
  country: string;
}

interface OnboardingState {
  isSubmitting: boolean;
  emailSent: boolean;
  isResendingEmail: boolean;
}

const regions = [
  { id: "north-america", name: "North America", countries: ["United States", "Canada", "Mexico"] },
  { id: "europe", name: "Europe", countries: ["United Kingdom", "Germany", "France", "Spain", "Italy", "Netherlands", "Sweden", "Norway", "Denmark", "Finland"] },
  { id: "asia-pacific", name: "Asia Pacific", countries: ["China", "Japan", "South Korea", "India", "Australia", "New Zealand", "Singapore", "Thailand", "Vietnam"] },
  { id: "latin-america", name: "Latin America", countries: ["Brazil", "Argentina", "Chile", "Colombia", "Peru", "Venezuela"] },
  { id: "africa", name: "Africa", countries: ["South Africa", "Nigeria", "Kenya", "Egypt", "Morocco", "Ghana"] },
  { id: "middle-east", name: "Middle East", countries: ["Saudi Arabia", "UAE", "Israel", "Turkey", "Iran", "Egypt"] }
];

export default function Onboarding(): JSX.Element {
  const navigate = useNavigate();
  const { user, signUp, loading } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    email: "",
    password: "",
    confirmPassword: "",
    region: "",
    city: "",
    country: ""
  });
  const [errors, setErrors] = useState<Partial<OnboardingData>>({});
  const [state, setState] = useState<OnboardingState>({
    isSubmitting: false,
    emailSent: false,
    isResendingEmail: false
  });

  // Auto-skip if user already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard?view=dashboard");
    }
  }, [user, loading, navigate]);

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<OnboardingData> = {};

    switch (step) {
      case 2: // Account creation
        if (!formData.email) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
        
        if (!formData.password) newErrors.password = "Password is required";
        else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";
        
        if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
        else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords don't match";
        break;
        
      case 3: // Region selection
        if (!formData.region) newErrors.region = "Please select a region";
        if (!formData.country) newErrors.country = "Please select a country";
        if (!formData.city) newErrors.city = "City is required";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        // Step 3 is location - after this, create account
        handleCreateAccount();
      } else if (currentStep === totalSteps) {
        handleComplete();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateAccount = async () => {
    if (!validateStep(currentStep)) return;

    setState(prev => ({ ...prev, isSubmitting: true }));
    try {
      await signUp(formData.email, formData.password);
      setState(prev => ({ ...prev, emailSent: true, isSubmitting: false }));
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });
      // Move to email verification step
      setCurrentStep(4);
    } catch (error) {
      setState(prev => ({ ...prev, isSubmitting: false }));
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleResendEmail = async () => {
    setState(prev => ({ ...prev, isResendingEmail: true }));
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });
      
      if (error) throw error;
      
      toast({
        title: "Email Sent!",
        description: "A new verification email has been sent to your inbox.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend email",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, isResendingEmail: false }));
    }
  };

  const handleComplete = () => {
    // This is called when user has verified their email and wants to go to dashboard
    navigate("/dashboard?view=dashboard");
  };

  const updateFormData = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Welcome to Breath Safe
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your journey to better air quality and healthier living starts here. 
                Let's get you set up in just a few simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <GlassCard className="floating-card p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Account Created</h3>
                <p className="text-sm text-muted-foreground">Your account has been successfully created</p>
              </GlassCard>

              <GlassCard className="floating-card p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Location Set</h3>
                <p className="text-sm text-muted-foreground">Your region and city preferences are configured</p>
              </GlassCard>

              <GlassCard className="floating-card p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Privacy Protected</h3>
                <p className="text-sm text-muted-foreground">Your data is secure and private</p>
              </GlassCard>

              <GlassCard className="floating-card p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Track</h3>
                <p className="text-sm text-muted-foreground">Start monitoring your air quality journey</p>
              </GlassCard>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Create Your Account</h2>
              <p className="text-muted-foreground">Secure your access to air quality insights</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Set Your Location</h2>
              <p className="text-muted-foreground">Help us provide accurate air quality data for your area</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="region">Region</Label>
                <select
                  id="region"
                  value={formData.region}
                  onChange={(e) => {
                    updateFormData("region", e.target.value);
                    updateFormData("country", "");
                    updateFormData("city", "");
                  }}
                  className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Select a region</option>
                  {regions.map(region => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
                {errors.region && <p className="text-sm text-red-500 mt-1">{errors.region}</p>}
              </div>

              {formData.region && (
                <div>
                  <Label htmlFor="country">Country</Label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => {
                      updateFormData("country", e.target.value);
                      updateFormData("city", "");
                    }}
                    className="w-full p-3 border border-input rounded-md bg-background text-foreground"
                  >
                    <option value="">Select a country</option>
                    {regions.find(r => r.id === formData.region)?.countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.country && <p className="text-sm text-red-500 mt-1">{errors.country}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter your city"
                  value={formData.city}
                  onChange={(e) => updateFormData("city", e.target.value)}
                  className={errors.city ? "border-red-500" : ""}
                />
                {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Check Your Email
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We've sent a verification email to <strong>{formData.email}</strong>. 
                Please click the link in the email to verify your account.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-center gap-3 text-blue-600">
                <Mail className="h-5 w-5" />
                <span className="font-medium">Verification Email Sent</span>
              </div>
              
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>• Check your inbox (and spam folder)</p>
                <p>• Click the verification link</p>
                <p>• Return here to continue setup</p>
              </div>
              
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={state.isResendingEmail}
                  className="w-full flex items-center gap-2"
                >
                  {state.isResendingEmail ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {state.isResendingEmail ? "Sending..." : "Resend Email"}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>After verifying your email, click "Next" to continue.</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                You're All Set!
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your Breath Safe account is ready. We'll start monitoring air quality in {formData.city}, {formData.country} 
                and provide you with personalized insights and recommendations.
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg max-w-md mx-auto">
              <h3 className="font-semibold text-foreground mb-4">What's Next?</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Access your personalized dashboard</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Set up location preferences</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Start earning rewards</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Receive air quality alerts</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Setting up your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-4">
      <GlassCard className="floating-card w-full max-w-4xl mx-auto">
        <GlassCardHeader className="text-center pb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Breath Safe</span>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </GlassCardHeader>

        <GlassCardContent className="pb-8">
          {renderStep()}
        </GlassCardContent>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center px-6 pb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex gap-2">
            {currentStep === 3 ? (
              <Button
                onClick={handleNext}
                disabled={state.isSubmitting}
                className="flex items-center gap-2"
              >
                {state.isSubmitting ? "Creating Account..." : "Create Account"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="flex items-center gap-2"
              >
                Go to Dashboard
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
