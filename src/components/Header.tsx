import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, RefreshCw, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

export default function Header({ 
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
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Left side - Mobile Menu Button and Greeting */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        {onMobileMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden h-10 w-10 rounded-full border-border hover:bg-accent"
            aria-label="Toggle mobile menu"
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        )}

        {/* Greeting and subtitle */}
        <div 
          className={`${onNavigate ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={() => onNavigate && onNavigate('profile')}
        >
          <h1 className="heading-lg text-foreground mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="body-md text-muted-foreground hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side - Search, actions, and profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search Bar - Hide on very small screens */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search AQI, features, products..."
            onClick={() => setIsSearchOpen(true)}
            className="pl-10 w-48 lg:w-64 bg-background border-border rounded-full h-9 cursor-pointer"
            readOnly
          />
        </div>

        {/* Refresh Button */}
        {showRefresh && onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-full border-border"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="hidden lg:block">
            <p className="body-sm font-medium text-foreground">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="body-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
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
