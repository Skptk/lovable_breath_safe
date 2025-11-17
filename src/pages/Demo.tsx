import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Home, Map, User, Trophy, ShoppingBag, Settings, Newspaper, History } from "lucide-react";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import "@/styles/app-background.css";

// Lazy load only the components needed for demo mode
const AirQualityDashboard = lazy(() => 
  import("@/components/AirQualityDashboard").then(module => ({
    default: module.AirQualityDashboard
  }))
);
const WeatherStats = lazy(() => import("@/components/WeatherStats"));

// Loading skeleton for lazy components
const PageSkeleton = () => (
  <div className="min-h-screen bg-background flex items-center justify-center w-full max-w-full overflow-x-hidden px-4">
    <div className="text-center space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 border-b-2 border-primary mx-auto"></div>
      <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Sign-up prompt component for restricted features
const SignUpPrompt = ({ feature }: { feature: string }) => (
  <motion.div 
    className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto text-center space-y-6 sm:space-y-7 md:space-y-8 lg:space-y-10 px-2 sm:px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto shadow-2xl">
        <Lock className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 xl:h-14 xl:w-14 text-primary-foreground" />
      </div>
      
      <div className="space-y-3 sm:space-y-4 lg:space-y-5">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-foreground px-2">
          Unlock {feature}
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-lg mx-auto leading-relaxed px-2">
          Create your free account to access comprehensive air quality data, track your environmental exposure, and start earning rewards today.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4 lg:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-md lg:max-w-lg mx-auto">
          <div className="text-left space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              Real-time AQI data
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              Personal health tracking
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              Achievement system
            </div>
          </div>
          <div className="text-left space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              Data history
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              Rewards store
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full flex-shrink-0"></div>
              Community features
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
        <Button 
          size="lg" 
          onClick={() => window.location.href = "/onboarding"}
          className="w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg xl:text-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          Create Free Account
          <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          onClick={() => window.location.href = "/auth"}
          className="w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg xl:text-xl font-semibold border-2 hover:bg-accent transition-all duration-300"
        >
          Sign In
        </Button>
      </div>

      <div className="pt-6 sm:pt-8 lg:pt-10">
        <Button 
          variant="ghost" 
          onClick={() => window.location.href = "/demo?view=dashboard"}
          className="text-xs sm:text-sm lg:text-base text-muted-foreground hover:text-foreground h-auto py-1 sm:py-2"
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
    { id: "history", label: "History", icon: History, accessible: false, feature: "Data History" },
    { id: "map", label: "Weather", icon: Map, accessible: true },
    { id: "news", label: "News", icon: Newspaper, accessible: false, feature: "Health News" },
    { id: "rewards", label: "Rewards", icon: Trophy, accessible: false, feature: "Rewards System" },
    { id: "store", label: "Store", icon: ShoppingBag, accessible: false, feature: "Rewards Store" },
    { id: "profile", label: "Profile", icon: User, accessible: false, feature: "Personal Profile" },
    { id: "settings", label: "Settings", icon: Settings, accessible: false, feature: "App Settings" },
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

  // Demo Sidebar Component
  const DemoSidebar = () => (
    <motion.aside 
      className="fixed left-0 top-0 h-full w-14 sm:w-16 lg:w-20 bg-card border-r border-border z-50 hidden md:flex flex-col items-center py-4 sm:py-5 md:py-6 space-y-2 sm:space-y-3 lg:space-y-4 backdrop-blur-sm"
      initial={{ x: -64 }}
      animate={{ x: 0 }}
      transition={{ 
        type: "spring", 
        damping: 25, 
        stiffness: 200,
        duration: 0.4
      }}
    >
      {/* App Logo */}
      <motion.div 
        className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center mb-4 sm:mb-6 lg:mb-8 shadow-lg"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-primary-foreground font-bold text-sm sm:text-base lg:text-lg">B</span>
      </motion.div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 sm:space-y-2 lg:space-y-3 w-full px-1 sm:px-2">
        {demoNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isAccessible = item.accessible;
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: 0.1 + index * 0.05, 
                duration: 0.3,
                ease: "easeOut"
              }}
            >
              <motion.div
                whileHover={isAccessible ? { scale: 1.1 } : {}}
                whileTap={isAccessible ? { scale: 0.95 } : {}}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  onClick={() => isAccessible && handleViewChange(item.id)}
                  disabled={!isAccessible}
                  className={`h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-xl transition-all duration-200 relative ${
                    isActive 
                      ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg border-accent' 
                      : isAccessible
                        ? 'text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent border-transparent'
                        : 'text-muted-foreground opacity-50 cursor-not-allowed border-transparent'
                  } border`}
                  title={isAccessible ? item.label : `${item.label} - Sign up required`}
                  aria-label={`${item.label}${isActive ? ' (current page)' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                  {!isAccessible && (
                    <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-3.5 lg:w-3.5 absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 text-muted-foreground" />
                  )}
                </Button>
              </motion.div>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom Spacing */}
      <div className="flex-1"></div>
    </motion.aside>
  );

  return (
    <div className="app-background">
      <div className="relative min-h-screen">
        <div className="relative z-10 flex min-h-screen bg-gradient-to-br from-background/60 via-background/30 to-background/80">
          <DemoSidebar />

          <div className="flex-1 md:ml-14 lg:ml-16 xl:ml-20 w-full max-w-full overflow-x-hidden">
            <div className="relative">
              {/* Demo Header Bar */}
              <motion.nav 
                className="bg-card border-b border-border backdrop-blur-sm sticky top-0 z-40 w-full max-w-full overflow-hidden"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12">
                  <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
                    {/* Logo and Title */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-foreground font-bold text-xs sm:text-sm lg:text-base">B</span>
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-foreground truncate">Breath Safe</h1>
                        <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground truncate">Demo Mode</p>
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-3 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = "/auth"}
                        className="h-7 sm:h-8 lg:h-9 xl:h-10 text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4"
                      >
                        Sign In
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => window.location.href = "/onboarding"}
                        className="bg-primary hover:bg-primary/90 h-7 sm:h-8 lg:h-9 xl:h-10 text-xs sm:text-sm lg:text-base px-2 sm:px-3 lg:px-4"
                      >
                        Get Started
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.nav>

              <MobileNavigation 
                currentView={currentView} 
                onViewChange={handleViewChange}
                isOpen={showMobileMenu}
                onClose={() => setShowMobileMenu(false)}
              />

              <main className="px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-5 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
                {/* Removed AnimatePresence - instant page transitions for better performance */}
                <div className="w-full max-w-full overflow-hidden">
                  {renderView()}
                </div>
              </main>

              <footer className="pb-4 sm:pb-5 md:pb-6 lg:pb-8 w-full max-w-full overflow-hidden">
                <Footer />
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
