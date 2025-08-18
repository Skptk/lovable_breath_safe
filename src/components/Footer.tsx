import { Heart, Shield, FileText, ShoppingBag, Map, BarChart3, User, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
      <footer className="bg-card border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* App Logo and Description */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">B</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Breath Safe</h3>
                  <p className="text-sm text-muted-foreground">Monitor air quality, earn rewards</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Built by Alex with love
              </p>
              <p className="text-xs text-muted-foreground">
                © 2025 Breath Safe. All rights reserved.
              </p>
            </div>

            {/* Legal Links Only */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Shield className="h-4 w-4" />
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <FileText className="h-4 w-4" />
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Full footer for authenticated users
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* App Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Breath Safe</h3>
                <p className="text-sm text-muted-foreground">Monitor air quality, earn rewards</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Built by Alex with love
            </p>
            <p className="text-xs text-muted-foreground">
              © 2025 Breath Safe. All rights reserved.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => navigateToView('dashboard')}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToView('products')}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Products
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToView('map')}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                >
                  <Map className="h-4 w-4" />
                  Map View
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToView('history')}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                >
                  <BarChart3 className="h-4 w-4" />
                  History
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigateToView('profile')}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Shield className="h-4 w-4" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <FileText className="h-4 w-4" />
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
