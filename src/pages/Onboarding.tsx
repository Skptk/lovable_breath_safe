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
          <div className="text-center space-y-6 sm:space-y-8 lg:space-y-10 w-full max-w-full overflow-hidden">
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground px-2">
                Welcome to Breath Safe
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-2">
                Your journey to better air quality and healthier living starts here. 
                Let's get you set up in just a few simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-w-4xl mx-auto w-full max-w-full overflow-hidden">
              <GlassCard className="floating-card p-4 sm:p-5 md:p-6 lg:p-8 text-center hover:shadow-lg transition-shadow w-full max-w-full overflow-hidden">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-5">
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold mb-1.5 sm:mb-2 lg:mb-3">Account Created</h3>
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Your account has been successfully created</p>
              </GlassCard>

              <GlassCard className="floating-card p-4 sm:p-5 md:p-6 lg:p-8 text-center hover:shadow-lg transition-shadow w-full max-w-full overflow-hidden">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-5">
                  <MapPin className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold mb-1.5 sm:mb-2 lg:mb-3">Location Set</h3>
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Your region and city preferences are configured</p>
              </GlassCard>

              <GlassCard className="floating-card p-4 sm:p-5 md:p-6 lg:p-8 text-center hover:shadow-lg transition-shadow w-full max-w-full overflow-hidden">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-5">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold mb-1.5 sm:mb-2 lg:mb-3">Privacy Protected</h3>
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Your data is secure and private</p>
              </GlassCard>

              <GlassCard className="floating-card p-4 sm:p-5 md:p-6 lg:p-8 text-center hover:shadow-lg transition-shadow w-full max-w-full overflow-hidden">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-5">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold mb-1.5 sm:mb-2 lg:mb-3">Ready to Track</h3>
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Start monitoring your air quality journey</p>
              </GlassCard>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="max-w-md lg:max-w-lg xl:max-w-xl mx-auto space-y-4 sm:space-y-5 lg:space-y-6 w-full max-w-full overflow-hidden px-2">
            <div className="text-center space-y-2 sm:space-y-3 lg:space-y-4">
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">Create Your Account</h2>
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground">Secure your access to air quality insights</p>
            </div>

            <div className="space-y-3 sm:space-y-4 lg:space-y-5">
              <div>
                <Label htmlFor="email" className="text-xs sm:text-sm lg:text-base font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className={`h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg ${errors.email ? "border-red-500" : ""}`}
                />
                {errors.email && <p className="text-xs sm:text-sm lg:text-base text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="text-xs sm:text-sm lg:text-base font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  className={`h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg ${errors.password ? "border-red-500" : ""}`}
                />
                {errors.password && <p className="text-xs sm:text-sm lg:text-base text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-xs sm:text-sm lg:text-base font-medium">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  className={`h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg ${errors.confirmPassword ? "border-red-500" : ""}`}
                />
                {errors.confirmPassword && <p className="text-xs sm:text-sm lg:text-base text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-md lg:max-w-lg xl:max-w-xl mx-auto space-y-4 sm:space-y-5 lg:space-y-6 w-full max-w-full overflow-hidden px-2">
            <div className="text-center space-y-2 sm:space-y-3 lg:space-y-4">
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">Set Your Location</h2>
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground">Help us provide accurate air quality data for your area</p>
            </div>

            <div className="space-y-3 sm:space-y-4 lg:space-y-5">
              <div>
                <Label htmlFor="region" className="text-xs sm:text-sm lg:text-base font-medium">Region</Label>
                <select
                  id="region"
                  value={formData.region}
                  onChange={(e) => {
                    updateFormData("region", e.target.value);
                    updateFormData("country", "");
                    updateFormData("city", "");
                  }}
                  className="w-full p-2.5 sm:p-3 lg:p-4 border border-input rounded-md bg-background text-foreground h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg"
                >
                  <option value="">Select a region</option>
                  {regions.map(region => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
                {errors.region && <p className="text-xs sm:text-sm lg:text-base text-red-500 mt-1">{errors.region}</p>}
              </div>

              {formData.region && (
                <div>
                  <Label htmlFor="country" className="text-xs sm:text-sm lg:text-base font-medium">Country</Label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => {
                      updateFormData("country", e.target.value);
                      updateFormData("city", "");
                    }}
                    className="w-full p-2.5 sm:p-3 lg:p-4 border border-input rounded-md bg-background text-foreground h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg"
                  >
                    <option value="">Select a country</option>
                    {regions.find(r => r.id === formData.region)?.countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.country && <p className="text-xs sm:text-sm lg:text-base text-red-500 mt-1">{errors.country}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="city" className="text-xs sm:text-sm lg:text-base font-medium">City</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Enter your city"
                  value={formData.city}
                  onChange={(e) => updateFormData("city", e.target.value)}
                  className={`h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg ${errors.city ? "border-red-500" : ""}`}
                />
                {errors.city && <p className="text-xs sm:text-sm lg:text-base text-red-500 mt-1">{errors.city}</p>}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6 sm:space-y-8 lg:space-y-10 w-full max-w-full overflow-hidden">
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 text-blue-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground px-2">
                Check Your Email
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-2">
                We've sent a verification email to <strong className="break-all">{formData.email}</strong>. 
                Please click the link in the email to verify your account.
              </p>
            </div>

            <div className="bg-card p-4 sm:p-5 md:p-6 lg:p-8 rounded-lg max-w-md lg:max-w-lg mx-auto space-y-3 sm:space-y-4 lg:space-y-5 w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-blue-600">
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                <span className="font-medium text-sm sm:text-base lg:text-lg xl:text-xl">Verification Email Sent</span>
              </div>
              
              <div className="space-y-2 sm:space-y-3 text-left text-xs sm:text-sm lg:text-base text-muted-foreground">
                <p>• Check your inbox (and spam folder)</p>
                <p>• Click the verification link</p>
                <p>• Return here to continue setup</p>
              </div>
              
              <div className="pt-3 sm:pt-4 lg:pt-5">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={state.isResendingEmail}
                  className="w-full flex items-center gap-2 h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg"
                >
                  {state.isResendingEmail ? (
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                  {state.isResendingEmail ? "Sending..." : "Resend Email"}
                </Button>
              </div>
            </div>
            
            <div className="text-xs sm:text-sm lg:text-base text-muted-foreground px-2">
              <p>After verifying your email, click "Next" to continue.</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6 sm:space-y-8 lg:space-y-10 w-full max-w-full overflow-hidden">
            <div className="space-y-3 sm:space-y-4 lg:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 text-green-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground px-2">
                You're All Set!
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-2">
                Your Breath Safe account is ready. We'll start monitoring air quality in {formData.city}, {formData.country} 
                and provide you with personalized insights and recommendations.
              </p>
            </div>

            <div className="bg-card p-4 sm:p-5 md:p-6 lg:p-8 rounded-lg max-w-md lg:max-w-lg mx-auto w-full max-w-full overflow-hidden">
              <h3 className="font-semibold text-base sm:text-lg lg:text-xl xl:text-2xl text-foreground mb-3 sm:mb-4 lg:mb-5">What's Next?</h3>
              <div className="space-y-2 sm:space-y-3 lg:space-y-4 text-left">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm lg:text-base text-muted-foreground">Access your personalized dashboard</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm lg:text-base text-muted-foreground">Set up location preferences</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm lg:text-base text-muted-foreground">Start earning rewards</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm lg:text-base text-muted-foreground">Receive air quality alerts</span>
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
      <div className="min-h-screen bg-background flex items-center justify-center w-full max-w-full overflow-x-hidden px-4">
        <div className="text-center space-y-3 sm:space-y-4 lg:space-y-6">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground">Setting up your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
      <GlassCard className="floating-card w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <GlassCardHeader className="text-center pb-4 sm:pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-10">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-primary rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 sm:w-5 sm:w-5 lg:w-6 lg:h-6 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">Breath Safe</span>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
            <div className="flex justify-between text-xs sm:text-sm lg:text-base text-muted-foreground">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-1.5 sm:h-2 lg:h-3" />
          </div>
        </GlassCardHeader>

        <GlassCardContent className="pb-4 sm:pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8">
          {renderStep()}
        </GlassCardContent>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg order-2 sm:order-1"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Back
          </Button>

          <div className="flex gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
            {currentStep === 3 ? (
              <Button
                onClick={handleNext}
                disabled={state.isSubmitting}
                className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg font-semibold"
              >
                {state.isSubmitting ? "Creating Account..." : "Create Account"}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            ) : currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg font-semibold"
              >
                Next
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg font-semibold"
              >
                Go to Dashboard
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
