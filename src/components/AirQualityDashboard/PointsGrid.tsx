import React from 'react';
import { motion } from 'framer-motion';
import { Award, Zap, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';

interface PointsGridProps {
  userPoints: any;
  onNavigate?: (route: string) => void;
}

function PointsGridComponent({
  userPoints,
  onNavigate,
}: PointsGridProps) {
  if (!userPoints) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }} 
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div 
        onClick={() => onNavigate?.("rewards")} 
        className="cursor-pointer hover:scale-105 transition-transform"
      >
        <StatCard 
          title="Total Points" 
          value={(userPoints.totalPoints || 0).toLocaleString()} 
          icon={<Award className="w-5 h-5" />} 
          subtitle="Earned from air quality monitoring" 
        />
      </div>

      <div 
        onClick={() => onNavigate?.("history")} 
        className="cursor-pointer hover:scale-105 transition-transform"
      >
        <StatCard 
          title="Today's Readings" 
          value={userPoints.todayReadings || 0} 
          icon={<Zap className="w-5 h-5" />} 
          subtitle="Air quality readings today" 
        />
      </div>

      <div 
        onClick={() => onNavigate?.("history")} 
        className="cursor-pointer hover:scale-105 transition-transform"
      >
        <StatCard 
          title="Weekly Activity" 
          value={userPoints.weeklyReadings || 0} 
          icon={<TrendingUp className="w-5 h-5" />} 
          subtitle="Readings this week" 
        />
      </div>
    </motion.div>
  );
}

export const PointsGrid: React.FC<PointsGridProps> = React.memo(PointsGridComponent);

PointsGrid.displayName = 'PointsGrid';
