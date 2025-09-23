import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import Header from '@/components/Header';

interface PermissionRequestProps {
  onRequest: () => void;
  requesting: boolean;
  userName: string;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export const PermissionRequest: React.FC<PermissionRequestProps> = React.memo(({
  onRequest,
  requesting,
  userName,
  showMobileMenu,
  onMobileMenuToggle,
}) => {
  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        title={`Hello, ${userName}!` }
        subtitle="Enable location access to monitor air quality"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center py-12"
      >
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <MapPin className="w-12 h-12 text-primary" />
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold">Location Access Required</h3>
            <p className="text-muted-foreground">
              To provide accurate air quality data, we need access to your
              location. This fetches real-time air quality for your area.
            </p>
          </div>

          <Button onClick={onRequest} disabled={requesting} className="w-full" size="lg">
            {requesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Requesting...
              </>
            ) : (
              <>
                <MapPin className="w-4 w-4 mr-2" />
                Enable Location Access
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Your location is used only for fetching air quality data and is not
            stored or shared.
          </p>
        </div>
      </motion.div>
    </div>
  );
});

PermissionRequest.displayName = 'PermissionRequest';
