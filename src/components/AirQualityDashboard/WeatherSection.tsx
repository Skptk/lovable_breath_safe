import React from 'react';
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
    <div ref={containerRef}>
      <WeatherStatsCard 
        latitude={coordinates.latitude} 
        longitude={coordinates.longitude} 
      />
    </div>
  );
}

export const WeatherSection: React.FC<WeatherSectionProps> = React.memo(WeatherSectionComponent);

WeatherSection.displayName = 'WeatherSection';
