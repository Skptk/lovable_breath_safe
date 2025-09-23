import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';

interface PollutantData {
  name: string;
  value: number;
  unit: string;
  description: string;
  color: string;
}

interface PollutantModalProps {
  pollutant: PollutantData | null;
  onClose: () => void;
}

export const PollutantModal: React.FC<PollutantModalProps> = React.memo(({
  pollutant,
  onClose,
}) => {
  if (!pollutant) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard variant="elevated" className="p-6">
          <div className="text-center space-y-4">
            <div className={`text-4xl font-bold ${pollutant.color}`}>
              {pollutant.value.toFixed(1)}
            </div>
            <div className="text-lg font-semibold">{pollutant.name}</div>
            <div className="text-muted-foreground">{pollutant.unit}</div>
            <p className="text-sm text-muted-foreground">{pollutant.description}</p>
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
});

PollutantModal.displayName = 'PollutantModal';
