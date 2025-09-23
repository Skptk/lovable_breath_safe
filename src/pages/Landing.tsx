import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  TrendingUp, 
  MapPin, 
  Award, 
  Users, 
  Zap,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Footer from "@/components/Footer";
// Development tools - only imported in development
const DevToolsWrapper = import.meta.env.DEV 
  ? React.lazy(() => import('@/components/dev/DevToolsWrapper')) 
  : () => null;


export default function Landing(): JSX.Element {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const [isHovered, setIsHovered] = useState<string | null>(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard?view=dashboard");
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Shield,
      title: "Real-time Air Quality",
      description: "Get instant updates on air quality in your area with accurate, up-to-date readings.",
      color: "text-blue-600"
    },
    {
      icon: TrendingUp,
      title: "Health Tracking",
      description: "Monitor your environmental exposure and track how air quality affects your health over time.",
      color: "text-green-600"
    },
    {
      icon: MapPin,
      title: "Location Intelligence",
      description: "Find the cleanest air in your city with my interactive map and location-based recommendations.",
      color: "text-purple-600"
    },
    {
      icon: Award,
      title: "Rewards & Achievements",
      description: "Earn points and unlock achievements for making environmentally conscious decisions.",
      color: "text-yellow-600"
    },
    {
      icon: Users,
      title: "Community Insights",
      description: "Join a community of health-conscious individuals sharing air quality knowledge.",
      color: "text-pink-600"
    },
    {
      icon: Zap,
      title: "Instant Alerts",
      description: "Receive notifications when air quality changes or reaches concerning levels.",
      color: "text-orange-600"
    }
  ];

  const stats = [
    { label: "Active Users", value: "Onboarding", description: "Trusting Breath Safe" },
    { label: "Cities Covered", value: "500+", description: "Worldwide coverage" },
    { label: "Data Source", value: "AQICN", description: "Real-time readings" },
    { label: "Health Score", value: "Pending", description: "User satisfaction" }
  ];

  const handleGetStarted = () => {
    navigate("/onboarding");
  };

  const handleSignIn = () => {
    navigate("/auth");
  };

  const handleTryApp = () => {
    navigate("/demo?view=dashboard");
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col ${theme}`}>
        {/* Development Tools - Only in development */}
        {import.meta.env.DEV && (
          <React.Suspense fallback={null}>
            <DevToolsWrapper />
          </React.Suspense>
        )}
        
        {/* Main content */}
        <main className="flex-1">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <Badge 
              variant="secondary" 
              className="mb-6 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20"
            >
              🌱 Breathe Cleaner, Live Healthier
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6 leading-tight">
              Monitor Air Quality
              <span className="block text-primary">Protect Your Health</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed font-light">
              Get real-time air quality data, track your environmental exposure, and earn rewards for making healthy choices. 
              Your lungs will thank you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="px-8 py-4 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleTryApp}
                className="px-8 py-4 text-lg font-semibold border-2 hover:bg-accent transition-all duration-300"
              >
                Try the app
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleSignIn}
                className="px-8 py-4 text-lg font-semibold border-2 hover:bg-accent transition-all duration-300"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-black text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground font-light">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Breathe Better
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              This webapp is currently under active development. Features may break and/or change regularly.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <GlassCard 
                  key={index}
                  className={`floating-card relative overflow-hidden transition-all duration-300 cursor-pointer group ${
                    isHovered === feature.title 
                      ? 'shadow-2xl transform scale-105' 
                      : 'shadow-lg hover:shadow-xl'
                  }`}
                  onMouseEnter={() => setIsHovered(feature.title)}
                  onMouseLeave={() => setIsHovered(null)}
                >
                  <GlassCardHeader className="pb-4">
                    <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <GlassCardTitle className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCardContent>
                  
                  {/* Hover effect overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Take Control of Your Air Quality?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Try the app now as I develop and roll out improvements and features.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="px-8 py-4 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleSignIn}
              className="px-8 py-4 text-lg font-semibold border-2 hover:bg-accent transition-all duration-300"
            >
              I Already Have an Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
