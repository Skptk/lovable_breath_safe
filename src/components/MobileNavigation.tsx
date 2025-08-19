import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Home, History, Map, Trophy, ShoppingBag, User, Settings, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";

interface MobileNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function MobileNavigation({ currentView, onViewChange, isOpen, onClose }: MobileNavigationProps): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  // Use external state if provided, otherwise use internal state
  const isMenuOpen = isOpen !== undefined ? isOpen : isMobileMenuOpen;
  const toggleMobileMenu = onClose ? onClose : () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleViewChange = (view: string) => {
    onViewChange(view);
    if (onClose) {
      onClose(); // Use external close function if provided
    } else {
      setIsMobileMenuOpen(false); // Otherwise use internal state
    }
  };

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        if (onClose) {
          onClose();
        } else {
          setIsMobileMenuOpen(false);
        }
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMenuOpen, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "history", label: "History", icon: History },
    { id: "map", label: "Map", icon: Map },
    { id: "rewards", label: "Rewards", icon: Trophy },
    { id: "store", label: "Store", icon: ShoppingBag },
    { id: "profile", label: "Profile", icon: User },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If system, toggle to opposite of current effective theme
      setTheme(isDark ? 'light' : 'dark');
    }
  };

  return (
    <>
      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] md:hidden transition-opacity duration-300"
          onClick={toggleMobileMenu}
        >
          {/* Slide-out drawer */}
          <div 
            className={`fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-card border-r border-border shadow-2xl transform transition-transform duration-300 ease-out ${
              isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-primary-foreground rounded-full"></div>
                </div>
                <h2 className="text-lg font-semibold text-foreground">Breath Safe</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="h-8 w-8 rounded-full hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Navigation Items */}
            <nav className="p-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 h-12 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    onClick={() => handleViewChange(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                );
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border bg-gradient-to-t from-background to-transparent">
              <div className="space-y-3">
                {/* Theme Toggle */}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={toggleTheme}
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span className="font-medium">
                    {isDark ? "Light Mode" : "Dark Mode"}
                  </span>
                </Button>

                {/* Settings */}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Settings</span>
                </Button>

                {/* Sign Out */}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 rounded-lg text-muted-foreground hover:text-error hover:bg-error/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
