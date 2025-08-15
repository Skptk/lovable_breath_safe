import { Button } from "@/components/ui/button";
import { Home, History, Map, User, Trophy, ShoppingBag } from "lucide-react";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Navigation({ currentView, onViewChange }: NavigationProps): JSX.Element {
  const navItems = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "history", label: "History", icon: History },
    { id: "map", label: "Map", icon: Map },
    { id: "rewards", label: "Rewards", icon: Trophy },
    { id: "store", label: "Store", icon: ShoppingBag },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onViewChange(item.id)}
              className={`flex-col gap-1 h-auto py-2 px-3 ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}