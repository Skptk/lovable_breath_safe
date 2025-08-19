import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Home, History, Map, Trophy, ShoppingBag, User } from "lucide-react";

interface MobileNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function MobileNavigation({ currentView, onViewChange, isOpen, onClose }: MobileNavigationProps): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMobileMenuOpen]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "history", label: "History", icon: History },
    { id: "map", label: "Map", icon: Map },
    { id: "rewards", label: "Rewards", icon: Trophy },
    { id: "store", label: "Store", icon: ShoppingBag },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <>
      {/* Mobile Menu Button - Fixed Top Left */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMobileMenu}
        className="fixed top-4 left-4 z-50 md:hidden h-10 w-10 rounded-full border border-border bg-card/80 backdrop-blur-sm shadow-lg"
        aria-label="Toggle mobile menu"
      >
        <Home className="h-5 w-5" />
      </Button>

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] md:hidden"
          onClick={toggleMobileMenu}
        >
          <div 
            className="fixed left-0 top-0 h-full w-80 bg-card border-r border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <nav className="p-6 space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 h-12 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    onClick={() => handleViewChange(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
