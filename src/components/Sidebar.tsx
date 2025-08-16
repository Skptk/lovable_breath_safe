import { Button } from "@/components/ui/button";
import { Home, History, Map, Trophy, ShoppingBag, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps): JSX.Element {
  const { signOut } = useAuth();

  const navItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "history", icon: History, label: "History" },
    { id: "map", icon: Map, label: "Map" },
    { id: "rewards", icon: Trophy, label: "Rewards" },
    { id: "store", icon: ShoppingBag, label: "Store" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-card border-r border-border flex flex-col items-center py-6 z-50 hidden md:flex">
      {/* Logo/App Icon */}
      <div className="mb-8">
        <div className="w-8 h-8 bg-primary rounded-ds-small flex items-center justify-center">
          <div className="w-4 h-4 bg-primary-foreground rounded-full"></div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col space-y-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              onClick={() => onViewChange(item.id)}
              className={`w-10 h-10 rounded-ds-medium transition-smooth relative group ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-ds-small opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            </Button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col space-y-4">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-ds-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-smooth"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="w-10 h-10 rounded-ds-medium text-muted-foreground hover:text-error hover:bg-error/10 transition-smooth"
          title="Sign Out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
