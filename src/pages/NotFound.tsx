import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto text-center px-2 sm:px-4"
      >
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-primary/20 mb-3 sm:mb-4 lg:mb-5">404</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-foreground mb-3 sm:mb-4 lg:mb-5">
            Page Not Found
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-lg mx-auto px-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <GlassCard className="floating-card max-w-md lg:max-w-lg xl:max-w-xl w-full text-center mx-auto">
          <GlassCardContent className="p-6 sm:p-7 md:p-8 lg:p-10 space-y-4 sm:space-y-5 lg:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 flex-shrink-0" />
                <span>Try checking the URL for typos</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground">
                <Home className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 flex-shrink-0" />
                <span>Or return to the homepage</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button 
                onClick={() => navigate(-1)}
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg font-semibold"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                Go Back
              </Button>
              <Button 
                onClick={() => navigate("/")}
                className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg font-semibold"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                Home
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>
      </motion.div>
    </div>
  );
}
