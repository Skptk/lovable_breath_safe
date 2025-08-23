import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="floating-card max-w-md w-full text-center">
          <CardContent className="p-8 space-y-6">
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <h2 className="text-3xl font-semibold text-foreground">Page Not Found</h2>
            <p className="text-xl text-muted-foreground">Oops! Page not found</p>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => window.history.back()} className="w-full sm:w-auto">
                Go Back
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full sm:w-auto">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default NotFound;
