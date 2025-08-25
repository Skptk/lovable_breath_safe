import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl mx-auto text-center"
      >
        <div className="mb-8">
          <div className="text-9xl font-black text-primary/20 mb-4">404</div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            Page Not Found
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <GlassCard className="floating-card max-w-md w-full text-center">
          <GlassCardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                <span>Try checking the URL for typos</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" />
                <span>Or return to the homepage</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => navigate(-1)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button 
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>
      </motion.div>
    </div>
  );
}
