import React from 'react';
import { motion } from 'framer-motion';
import WeatherStatsCard from '../WeatherStatsCard';
import { useReflowOptimization } from '@/hooks/useReflowOptimization';

interface WeatherSectionProps {
  coordinates: { 
    latitude: number; 
    longitude: number; 
  } | null;
}

function WeatherSectionComponent({ coordinates }: WeatherSectionProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { scheduleMeasurement } = useReflowOptimization<DOMRect>({
    debugLabel: 'WeatherSectionLayout',
    measure: () => containerRef.current?.getBoundingClientRect() ?? new DOMRect(),
    minMeasureIntervalMs: 48,
  });

  React.useEffect(() => {
    if (!coordinates) return;
    let frameId: number | null = requestAnimationFrame(() => {
      scheduleMeasurement();
    });

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    };
  }, [coordinates?.latitude, coordinates?.longitude, scheduleMeasurement]);

  // Early return if coordinates are not available
  if (!coordinates || 
      typeof coordinates.latitude !== 'number' || 
      typeof coordinates.longitude !== 'number') {
    return null;
  }

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.32, ease: "easeOut", delay: 0.18 }}
    >
      <WeatherStatsCard 
        latitude={coordinates.latitude} 
        longitude={coordinates.longitude} 
      />
    </motion.div>
  );
}

export const WeatherSection: React.FC<WeatherSectionProps> = React.memo(WeatherSectionComponent);

WeatherSection.displayName = 'WeatherSection';
