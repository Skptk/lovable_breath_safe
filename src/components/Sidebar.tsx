import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, History, Map, Trophy, ShoppingBag, User, Newspaper, Settings } from "lucide-react";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps): JSX.Element {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "history", label: "History", icon: History },
    { id: "map", label: "Weather", icon: Map },
    { id: "news", label: "News", icon: Newspaper },
    { id: "rewards", label: "Rewards", icon: Trophy },
    { id: "store", label: "Store", icon: ShoppingBag },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <motion.aside 
      className="fixed left-0 top-0 h-full w-16 bg-card border-r border-border z-50 hidden md:flex flex-col items-center py-6 space-y-4 backdrop-blur-sm"
      initial={{ x: -64 }}
      animate={{ x: 0 }}
      transition={{ 
        type: "spring", 
        damping: 25, 
        stiffness: 200,
        duration: 0.4
      }}
      style={{ contain: 'layout paint' }}
    >
      {/* App Logo */}
      <motion.div 
        className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center mb-8 shadow-lg"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-primary-foreground font-bold text-lg">B</span>
      </motion.div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2">
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
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{ willChange: 'transform' }}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  onClick={() => onViewChange(item.id)}
                  className={`h-12 w-12 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md border-accent' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent border-transparent'
                  } border`}
                  title={item.label}
                  aria-label={`${item.label}${isActive ? ' (current page)' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
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
}
