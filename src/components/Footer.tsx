import { motion } from "framer-motion";
import { Heart, Shield, FileText, ShoppingBag, Map, BarChart3, User, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export default function Footer() {
  const { user } = useAuth();

  // Function to navigate to different views
  const navigateToView = (view: string) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('view', view);
    window.history.pushState({}, '', currentUrl.toString());
    // Trigger a custom event to notify the Index component
    window.dispatchEvent(new CustomEvent('viewChange', { detail: { view } }));
  };

  // If user is not authenticated, show minimal footer
  if (!user) {
    return (
      <motion.footer 
        className="bg-card border-t border-border mt-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* App Logo and Description */}
            <div className="text-center md:text-left">
              <motion.div 
                className="flex items-center justify-center md:justify-start gap-3 mb-4"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">B</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Breath Safe</h3>
                  <p className="text-sm text-muted-foreground">Monitor air quality, earn rewards</p>
                </div>
              </motion.div>
              <p className="text-sm text-muted-foreground mb-4">
                Built by Alex with love
              </p>
              <p className="text-xs text-muted-foreground">
                © 2025 Breath Safe. All rights reserved.
              </p>
            </div>

            {/* Legal Links Only */}
            <div className="text-center md:text-left">
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link to="/privacy" className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Shield className="h-4 w-4" />
                      Privacy Policy
                    </Link>
                  </motion.div>
                </li>
                <li>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link to="/terms" className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <FileText className="h-4 w-4" />
                      Terms of Service
                    </Link>
                  </motion.div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.footer>
    );
  }

  // Full footer for authenticated users
  return (
    <motion.footer 
      className="bg-card border-t border-border mt-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* App Logo and Description */}
          <div className="col-span-1 sm:col-span-2 text-center sm:text-left">
            <motion.div 
              className="flex items-center justify-center sm:justify-start gap-3 mb-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Breath Safe</h3>
                <p className="text-sm text-muted-foreground">Monitor air quality, earn rewards</p>
              </div>
            </motion.div>
            <p className="text-sm text-muted-foreground mb-4">
              Built by Alex with love
            </p>
            <p className="text-xs text-muted-foreground">
              © 2025 Breath Safe. All rights reserved.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="text-center sm:text-left">
            <h4 className="font-semibold text-foreground mb-4">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button 
                    onClick={() => navigateToView('dashboard')}
                    className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <Home className="h-4 w-4" />
                    Dashboard
                  </button>
                </motion.div>
              </li>
              <li>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button 
                    onClick={() => navigateToView('products')}
                    className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Products
                  </button>
                </motion.div>
              </li>
              <li>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button 
                    onClick={() => navigateToView('map')}
                    className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <Map className="h-4 w-4" />
                    Map View
                  </button>
                </motion.div>
              </li>
              <li>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button 
                    onClick={() => navigateToView('history')}
                    className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <BarChart3 className="h-4 w-4" />
                    History
                  </button>
                </motion.div>
              </li>
              <li>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button 
                    onClick={() => navigateToView('profile')}
                    className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                </motion.div>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="text-center sm:text-left">
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link to="/privacy" className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Shield className="h-4 w-4" />
                    Privacy Policy
                  </Link>
                </motion.div>
              </li>
              <li>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link to="/terms" className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <FileText className="h-4 w-4" />
                    Terms of Service
                  </Link>
                </motion.div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
