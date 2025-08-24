import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, RefreshCw, Menu, X, MapPin, MapPinOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import SearchDialog from "./SearchDialog";
import NotificationBell from "./NotificationBell";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNavigate?: (route: string) => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

function Header({ 
  title, 
  subtitle, 
  showRefresh = false, 
  onRefresh, 
  isRefreshing = false,
  onNavigate,
  showMobileMenu = false,
  onMobileMenuToggle
}: HeaderProps): JSX.Element {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // Check location permission status
  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        if (navigator.permissions) {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
          setLocationPermission(permissionStatus.state);
          
          // Listen for permission changes
          permissionStatus.onchange = () => {
            setLocationPermission(permissionStatus.state);
          };
        } else {
          // Fallback for browsers without permissions API
          setLocationPermission('unknown');
        }
      } catch (error) {
        console.warn('Failed to check location permission:', error);
        setLocationPermission('unknown');
      }
    };

    checkLocationPermission();
  }, []);

  // Get location permission icon and color
  const getLocationPermissionDisplay = () => {
    switch (locationPermission) {
      case 'granted':
        return {
          icon: <MapPin className="h-4 w-4 text-green-500" />,
          tooltip: 'Location access granted',
          className: 'text-green-500'
        };
      case 'denied':
        return {
          icon: <MapPinOff className="h-4 w-4 text-red-500" />,
          tooltip: 'Location access denied',
          className: 'text-red-500'
        };
      case 'prompt':
        return {
          icon: <MapPin className="h-4 w-4 text-yellow-500" />,
          tooltip: 'Location permission not set',
          className: 'text-yellow-500'
        };
      default:
        return {
          icon: <MapPin className="h-4 w-4 text-gray-500" />,
          tooltip: 'Location permission unknown',
          className: 'text-gray-500'
        };
    }
  };

  const locationDisplay = getLocationPermissionDisplay();

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Left side - Mobile Menu Button and Greeting */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        {onMobileMenuToggle && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileMenuToggle}
              className="md:hidden h-10 w-10 rounded-full border-border hover:bg-accent"
              aria-label="Toggle mobile menu"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </motion.div>
        )}

        {/* Greeting and subtitle */}
        <motion.div 
          className={`${onNavigate ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={() => onNavigate && onNavigate('profile')}
          whileHover={onNavigate ? { scale: 1.02 } : {}}
          whileTap={onNavigate ? { scale: 0.98 } : {}}
        >
          <h1 className="heading-lg text-foreground mb-1 font-black">
            {title}
          </h1>
          {subtitle && (
            <p className="body-md text-muted-foreground hidden sm:block font-light">
              {subtitle}
            </p>
          )}
        </motion.div>
      </div>

      {/* Right side - Search, actions, and profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search Bar - Hide on very small screens */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Input
              type="text"
              placeholder="Search AQI, features, products..."
              onClick={() => setIsSearchOpen(true)}
              className="pl-10 w-48 lg:w-64 bg-card border-border rounded-full h-9 cursor-pointer input-modern"
              readOnly
            />
          </motion.div>
        </div>

        {/* Refresh Button */}
        {showRefresh && onRefresh && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 rounded-full border-border hover:bg-accent hover:border-accent transition-all duration-200"
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>
        )}

        {/* Location Permission Indicator */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="hidden sm:flex"
          title={locationDisplay.tooltip}
        >
          <div className={`h-9 w-9 rounded-full border border-border flex items-center justify-center ${locationDisplay.className}`}>
            {locationDisplay.icon}
          </div>
        </motion.div>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Profile Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 rounded-full border-border hover:bg-accent hover:border-accent transition-all duration-200"
              aria-label="Switch to light/dark mode"
            >
              <div className="h-4 w-4">
                <div className="dark:hidden">🌙</div>
                <div className="hidden dark:block">☀️</div>
              </div>
            </Button>
          </motion.div>

          {/* User Avatar */}
          {user && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Avatar className="h-9 w-9 border-2 border-border hover:border-accent transition-all duration-200 cursor-pointer">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.split('@')[0]?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          )}
        </div>
      </div>

      {/* Search Dialog */}
      <SearchDialog 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen}
        onNavigate={onNavigate}
      />
    </div>
  );
}

// Export both named and default exports for maximum compatibility
export { Header };
export default Header;
