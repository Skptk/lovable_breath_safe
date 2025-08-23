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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Email Subscription Section */}
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold text-foreground mb-2">Join our email list</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get exclusive deals and early access to new products.
              </p>
              <div className="flex items-center max-w-md">
                <input
                  type="email"
                  placeholder="Email address"
                  className="flex-1 px-4 py-3 rounded-l-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button className="px-4 py-3 bg-foreground text-background rounded-r-lg hover:bg-foreground/90 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* App Logo and Description */}
            <div className="text-center md:text-left">
              <motion.div 
                className="flex items-center justify-center md:justify-start gap-3 mb-4"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
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
          </div>

          {/* Legal Links - Centered */}
          <div className="mt-8 text-center">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy policy
              </Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Refund policy
              </Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Contact information
              </Link>
            </div>
          </div>

          {/* Social Media Icons - Centered */}
          <div className="mt-6 text-center">
            <div className="flex justify-center space-x-4">
              {/* Instagram */}
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">IG</span>
              </div>
              {/* TikTok */}
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">TT</span>
              </div>
              {/* YouTube */}
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">YT</span>
              </div>
            </div>
          </div>
        </div>
      </motion.footer>
    );
  }

  // Full footer for authenticated users - NO navigation links, only legal
  return (
    <motion.footer 
      className="bg-card border-t border-border mt-auto backdrop-blur-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {/* App Logo and Description */}
          <div className="col-span-1 sm:col-span-2 text-center sm:text-left">
            <motion.div 
              className="flex items-center justify-center sm:justify-start gap-3 mb-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
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
        </div>

        {/* Legal Links - Centered */}
        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Refund policy
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact information
            </Link>
          </div>
        </div>

        {/* Social Media Icons - Centered */}
        <div className="mt-6 text-center">
          <div className="flex justify-center space-x-4">
            {/* Instagram */}
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">IG</span>
            </div>
            {/* TikTok */}
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">TT</span>
            </div>
            {/* YouTube */}
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">YT</span>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
