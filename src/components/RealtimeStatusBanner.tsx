import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';

/**
 * Global banner component that shows realtime connection status
 * Appears at the top of the page with smooth animations
 */
export function RealtimeStatusBanner() {
  const { status, isConnected } = useRealtimeStatus();

  // Don't show banner when connected
  if (isConnected) {
    return null;
  }

  const getBannerConfig = () => {
    switch (status) {
      case 'reconnecting':
        return {
          icon: <Wifi className="h-4 w-4" />,
          text: '⚡ Reconnecting to realtime…',
          bgColor: 'bg-yellow-500',
          textColor: 'text-yellow-900',
          borderColor: 'border-yellow-600',
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: '❌ Connection lost. Retrying…',
          bgColor: 'bg-red-500',
          textColor: 'text-red-900',
          borderColor: 'border-red-600',
        };
      default:
        return null;
    }
  };

  const config = getBannerConfig();
  if (!config) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 ${config.bgColor} ${config.textColor} ${config.borderColor} border-b px-4 py-2 text-center text-sm font-medium shadow-lg`}
      >
        <div className="flex items-center justify-center gap-2">
          {config.icon}
          <span>{config.text}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
