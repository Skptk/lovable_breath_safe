import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Home, Map, User, Trophy, ShoppingBag, Settings, Newspaper } from "lucide-react";
import BackgroundManager from "@/components/BackgroundManager";
import { AirParticles } from "@/components";
import Footer from "@/components/Footer";

// Lazy load only the components needed for demo mode
const AirQualityDashboard = lazy(() => 
  import("@/components/AirQualityDashboard").then(module => ({
    default: module.AirQualityDashboard
  }))
);
const WeatherStats = lazy(() => import("@/components/WeatherStats"));

// Loading skeleton for lazy components
const PageSkeleton = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Sign-up prompt component for restricted features
const SignUpPrompt = ({ feature }: { feature: string }) => (
  <motion.div 
    className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-4"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto shadow-2xl">
        <Lock className="h-12 w-12 text-primary-foreground" />
      </div>
      
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-foreground">
          Unlock {feature}
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Create your free account to access comprehensive air quality data, track your environmental exposure, and start earning rewards today.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Real-time AQI data
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Personal health tracking
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Achievement system
            </div>
          </div>
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Data history
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Rewards store
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Community features
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button 
          size="lg" 
          onClick={() => window.location.href = "/onboarding"}
          className="px-8 py-4 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          Create Free Account
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          onClick={() => window.location.href = "/auth"}
          className="px-8 py-4 text-lg font-semibold border-2 hover:bg-accent transition-all duration-300"
        >
          Sign In
        </Button>
      </div>

      <div className="pt-8">
        <Button 
          variant="ghost" 
          onClick={() => window.location.href = "/demo?view=dashboard"}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back to Demo Dashboard
        </Button>
      </div>
    </div>
  </motion.div>
);

export default function Demo(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Listen for custom view change events
  useEffect(() => {
    const handleViewChange = (event: CustomEvent) => {
      const newView = event.detail.view;
      console.log('Demo component - View change event received:', newView);
      setCurrentView(newView);
    };

    window.addEventListener('viewChange', handleViewChange as EventListener);
    
    return () => {
      window.removeEventListener('viewChange', handleViewChange as EventListener);
    };
  }, []);

  // Initialize current view from URL parameters on mount only
  useEffect(() => {
    const view = searchParams.get("view") || "dashboard";
    if (view !== currentView) {
      console.log('Demo component - Initializing view from URL:', view);
      setCurrentView(view);
    }
  }, []); // Empty dependency array - only run on mount

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    // Update URL without page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('view', view);
    window.history.pushState({}, '', newUrl.toString());
  };

  // Demo navigation items - only dashboard and weather are accessible
  const demoNavItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, accessible: true },
    { id: "map", label: "Weather", icon: Map, accessible: true },
    { id: "history", label: "History", icon: User, accessible: false, feature: "Data History" },
    { id: "rewards", label: "Rewards", icon: Trophy, accessible: false, feature: "Rewards System" },
    { id: "store", label: "Store", icon: ShoppingBag, accessible: false, feature: "Rewards Store" },
    { id: "profile", label: "Profile", icon: User, accessible: false, feature: "Personal Profile" },
    { id: "settings", label: "Settings", icon: Settings, accessible: false, feature: "App Settings" },
    { id: "news", label: "News", icon: Newspaper, accessible: false, feature: "Health News" },
  ];

  const renderView = (): JSX.Element => {
    switch (currentView) {
      case "dashboard":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <AirQualityDashboard 
              onNavigate={handleViewChange} 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
              isDemoMode={true}
            />
          </Suspense>
        );
      case "map":
        return (
          <Suspense fallback={<PageSkeleton />}>
            <WeatherStats 
              showMobileMenu={showMobileMenu}
              onMobileMenuToggle={toggleMobileMenu}
              isDemoMode={true}
            />
          </Suspense>
        );
      default: {
        // For all other views, show sign-up prompt
        const navItem = demoNavItems.find(item => item.id === currentView);
        return <SignUpPrompt feature={navItem?.feature || "This Feature"} />;
      }
    }
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <BackgroundManager>
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex flex-col">
        <AirParticles />
        {/* Demo Navigation Bar */}
        <motion.nav 
          className="bg-card border-b border-border backdrop-blur-xl sticky top-0 z-50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Title */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">B</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Breath Safe</h1>
                  <p className="text-xs text-muted-foreground">Demo Mode</p>
                </div>
              </div>

              {/* Demo Navigation */}
              <div className="hidden md:flex items-center space-x-2">
                {demoNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const isAccessible = item.accessible;
                  
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleViewChange(item.id)}
                      className={`transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground' 
                          : isAccessible
                            ? 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            : 'text-muted-foreground opacity-50 cursor-not-allowed'
                      }`}
                      disabled={!isAccessible}
                      title={isAccessible ? item.label : `${item.label} - Sign up required`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                      {!isAccessible && <Lock className="h-3 w-3 ml-2" />}
                    </Button>
                  );
                })}
              </div>

              {/* CTA Buttons */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = "/auth"}
                >
                  Sign In
                </Button>
                <Button 
                  size="sm"
                  onClick={() => window.location.href = "/onboarding"}
                  className="bg-primary hover:bg-primary/90"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </motion.nav>
        
        {/* Main Content Area */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeInOut"
              }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </BackgroundManager>
  );
}
