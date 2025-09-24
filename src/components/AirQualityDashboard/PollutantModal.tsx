import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';

// Re-export the Pollutant interface for consistency
import type { Pollutant } from './AQICard';

export interface PollutantModalProps {
  /**
   * The pollutant data to display in the modal.
   * When null, the modal will not be rendered.
   */
  pollutant: Pollutant | null;
  
  /**
   * Callback function called when the modal is closed
   */
  onClose: () => void;
}

/**
 * A modal dialog that displays detailed information about a specific air pollutant.
 * Includes animations, keyboard navigation, and focus management for accessibility.
 */
export const PollutantModal: React.FC<PollutantModalProps> = React.memo(({
  pollutant,
  onClose,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  
  // Close modal on Escape key press
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  // Focus trap for accessibility
  React.useEffect(() => {
    if (pollutant && modalRef.current) {
      // Focus the modal when it opens
      modalRef.current.focus();
    }
  }, [pollutant]);

  return (
    <AnimatePresence>
      {pollutant && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pollutant-modal-title"
          aria-describedby="pollutant-modal-description"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="relative max-w-md w-full mx-4 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <GlassCard 
              variant="elevated" 
              className="relative p-6 shadow-xl"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center space-y-5">
                {/* Pollutant Value */}
                <div 
                  className={`text-5xl font-bold ${pollutant.color} transition-colors`}
                  aria-label={`${pollutant.value.toFixed(1)} ${pollutant.unit}`}
                >
                  {pollutant.value.toFixed(1)}
                  <span className="text-2xl ml-1">{pollutant.unit}</span>
                </div>
                
                {/* Pollutant Name */}
                <h2 
                  id="pollutant-modal-title"
                  className="text-2xl font-bold text-foreground"
                >
                  {pollutant.name}
                </h2>
                
                {/* Pollutant Description */}
                <p 
                  id="pollutant-modal-description"
                  className="text-muted-foreground leading-relaxed"
                >
                  {pollutant.description}
                </p>
                
                {/* Health Impact */}
                <div className="pt-4 border-t border-muted/30">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Health Impact
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getHealthImpact(pollutant.name, pollutant.value)}
                  </p>
                </div>
                
                {/* Close Button */}
                <Button 
                  onClick={onClose} 
                  variant="outline" 
                  className="w-full mt-6"
                  size="lg"
                >
                  Close
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

PollutantModal.displayName = 'PollutantModal';

/**
 * Helper function to get health impact information based on pollutant and value
 */
function getHealthImpact(name: string, value: number): string {
  type ImpactLevel = {
    min: number;
    max: number;
    description: string;
  };

  const impacts: Record<string, ImpactLevel[]> = {
    'PM2.5': [
      { min: 0, max: 12, description: 'Air quality is considered satisfactory.' },
      { min: 12.1, max: 35.4, description: 'Unusually sensitive people should consider reducing prolonged outdoor exertion.' },
      { min: 35.5, max: 55.4, description: 'People with heart or lung disease, older adults, and children should reduce prolonged outdoor exertion.' },
      { min: 55.5, max: 150.4, description: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.' },
      { min: 150.5, max: 250.4, description: 'Health alert - everyone may experience more serious health effects.' }
    ],
    'PM10': [
      { min: 0, max: 54, description: 'Air quality is considered satisfactory.' },
      { min: 55, max: 154, description: 'Unusually sensitive people should consider reducing prolonged outdoor exertion.' },
      { min: 155, max: 254, description: 'People with heart or lung disease, older adults, and children should reduce prolonged outdoor exertion.' }
    ],
    'NO₂': [
      { min: 0, max: 53, description: 'Air quality is considered satisfactory.' },
      { min: 54, max: 100, description: 'Unusually sensitive people should consider reducing prolonged outdoor exertion.' },
      { min: 101, max: 360, description: 'People with respiratory diseases should reduce outdoor exercise.' }
    ],
    'SO₂': [
      { min: 0, max: 35, description: 'Air quality is considered satisfactory.' },
      { min: 36, max: 75, description: 'People with asthma should consider reducing outdoor activities.' },
      { min: 76, max: 185, description: 'People with asthma should avoid outdoor activities.' }
    ],
    'CO': [
      { min: 0, max: 4.4, description: 'Air quality is considered satisfactory.' },
      { min: 4.5, max: 9.4, description: 'People with heart disease should reduce heavy exertion.' },
      { min: 9.5, max: 12.4, description: 'People with heart disease should avoid heavy exertion.' }
    ],
    'O₃': [
      { min: 0, max: 54, description: 'Air quality is considered satisfactory.' },
      { min: 55, max: 70, description: 'Unusually sensitive people should consider reducing prolonged outdoor exertion.' },
      { min: 71, max: 85, description: 'People with lung disease should reduce outdoor activities.' }
    ]
  };

  const defaultImpact = 'No specific health impact information available.';
  const pollutantImpacts: ImpactLevel[] = impacts[name] || [];
  
  if (pollutantImpacts.length === 0) {
    return defaultImpact;
  }
  
  // Find the most relevant impact based on value
  for (const impact of pollutantImpacts) {
    if (value >= impact.min && value <= impact.max) {
      return impact.description;
    }
  }
  
  // If no range matches, return the last impact (worst case)
  const lastImpact = pollutantImpacts[pollutantImpacts.length - 1];
  return lastImpact ? lastImpact.description : defaultImpact;
}
