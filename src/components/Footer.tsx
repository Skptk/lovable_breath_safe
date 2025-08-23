import { motion } from "framer-motion";
import { Heart, Shield, FileText, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Footer() {
  const { user } = useAuth();

  // If user is not authenticated, show minimal footer with email subscription
  if (!user) {
    return (
      <motion.footer 
        className="bg-card border-t border-border mt-auto backdrop-blur-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
            {/* Left Side - Branding */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">B</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Breath Safe</h3>
                  <p className="text-sm text-muted-foreground">Monitor air quality, earn rewards</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Built by Alex with love</p>
            </div>

            {/* Right Side - Email Subscription */}
            <div className="flex flex-col items-center lg:items-end text-center lg:text-right">
              <h4 className="text-lg font-semibold text-foreground mb-3">Join our email list</h4>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Stay updated with the latest air quality insights, health tips, and exclusive rewards.
              </p>
              <div className="flex w-full max-w-sm gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Copyright - Centered at bottom */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">© 2025 Breath Safe. All rights reserved.</p>
          </div>
        </div>
      </motion.footer>
    );
  }

  // For authenticated users, show minimal footer with only legal links
  return (
    <motion.footer 
      className="bg-card border-t border-border mt-auto backdrop-blur-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          {/* Left Side - Branding */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">B</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Breath Safe</h3>
                <p className="text-sm text-muted-foreground">Monitor air quality, earn rewards</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Built by Alex with love</p>
          </div>

          {/* Right Side - Social Media and Legal Links */}
          <div className="flex flex-col items-center lg:items-end text-center lg:text-right gap-4">
            {/* Social Media Icons - Above Legal Links */}
            <div className="flex gap-3">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform"
              >
                X
              </a>
              <a 
                href="https://tiktok.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform"
              >
                TT
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform"
              >
                YT
              </a>
            </div>

            {/* Legal Links - Below Social Media */}
            <div className="flex flex-wrap justify-center lg:justify-end gap-6 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy policy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Refund policy
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact information
              </Link>
            </div>
          </div>
        </div>
        
        {/* Copyright - Centered at bottom */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">© 2025 Breath Safe. All rights reserved.</p>
        </div>
      </div>
    </motion.footer>
  );
}
