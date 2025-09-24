import React from 'react';
import { motion } from 'framer-motion';
import WeatherStatsCard from '../WeatherStatsCard';

interface WeatherSectionProps {
  coordinates: { 
    latitude: number; 
    longitude: number; 
  } | null;
}

function WeatherSectionComponent({ coordinates }: WeatherSectionProps) {
  // Early return if coordinates are not available
  if (!coordinates || 
      typeof coordinates.latitude !== 'number' || 
      typeof coordinates.longitude !== 'number') {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
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
