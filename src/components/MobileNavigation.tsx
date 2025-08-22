import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Home, History, Map, Trophy, ShoppingBag, User, Settings, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
    { id: "map", label: "Weather", icon: Map },
    { id: "news", label: "News", icon: History },
    { id: "rewards", label: "Rewards", icon: Trophy },
    { id: "store", label: "Store", icon: ShoppingBag },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
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
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobileMenu}
          />
        )}
      </AnimatePresence>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-card border-r border-border z-50 md:hidden"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <motion.div 
                className="flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-primary-foreground font-bold text-lg">B</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Breath Safe</h2>
                  <p className="text-sm text-muted-foreground">Navigation</p>
                </div>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMobileMenu}
                  className="h-10 w-10 rounded-full border-border hover:bg-accent hover:border-accent transition-all duration-200"
                  aria-label="Close mobile menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </motion.div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-6 space-y-2">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
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
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        onClick={() => handleViewChange(item.id)}
                        className={`w-full justify-start h-12 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg border-accent' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent border-transparent'
                        } border`}
                        aria-label={`${item.label}${isActive ? ' (current page)' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {item.label}
                      </Button>
                    </motion.div>
                  </motion.div>
                );
              })}
            </nav>

            {/* Bottom Section - Theme Toggle and Sign Out */}
            <div className="p-6 border-t border-border space-y-4">
              {/* Theme Toggle */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={toggleTheme}
                  className="w-full justify-start h-12 rounded-xl border-border hover:bg-accent hover:border-accent transition-all duration-200"
                  aria-label="Switch to light/dark mode"
                >
                  {isDark ? <Sun className="h-5 w-5 mr-3" /> : <Moon className="h-5 w-5 mr-3" />}
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </Button>
              </motion.div>

              {/* Sign Out */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                  className="w-full justify-start h-12 rounded-xl"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
