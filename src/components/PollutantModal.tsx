import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface PollutantDetail {
  pollutant_code: string;
  name: string;
  description: string;
  health_effects: string;
  safe_levels: string;
}

interface PollutantModalProps {
  pollutant: string;
  value: number;
  unit: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PollutantModal({ 
  pollutant, 
  value, 
  unit, 
  isOpen, 
  onClose 
}: PollutantModalProps) {
  const [details, setDetails] = useState<PollutantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && pollutant) {
      fetchPollutantDetails();
    }
  }, [isOpen, pollutant]);

  const fetchPollutantDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('pollutant_details')
        .select('*')
        .eq('pollutant_code', pollutant.toUpperCase())
        .single();

      if (error) throw error;
      setDetails(data);
    } catch (error) {
      console.error('Error fetching pollutant details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSafetyLevel = (pollutantCode: string, value: number) => {
    // Simplified safety assessment based on WHO guidelines
    const thresholds: Record<string, { good: number; moderate: number }> = {
      PM25: { good: 15, moderate: 25 },
      PM10: { good: 45, moderate: 75 },
      NO2: { good: 25, moderate: 40 },
      SO2: { good: 40, moderate: 80 },
      CO: { good: 10, moderate: 30 },
      O3: { good: 100, moderate: 160 }
    };

    const threshold = thresholds[pollutantCode];
    if (!threshold) return { level: 'Unknown', color: 'bg-muted' };

    if (value <= threshold.good) {
      return { level: 'Good', color: 'bg-green-500' };
    } else if (value <= threshold.moderate) {
      return { level: 'Moderate', color: 'bg-yellow-500' };
    } else {
      return { level: 'Poor', color: 'bg-red-500' };
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-card border-0">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!details) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-card border-0">
          <DialogHeader>
            <DialogTitle>{pollutant}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Detailed information not available for this pollutant.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const safety = getSafetyLevel(details.pollutant_code, value);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-card border-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {details.name}
            <Badge className={`text-white ${safety.color} border-0`}>
              {safety.level}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {value} {unit}
            </div>
            <div className="text-sm text-muted-foreground">Current Level</div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">What is {details.name}?</h4>
            <p className="text-sm text-muted-foreground">
              {details.description}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Health Effects</h4>
            <p className="text-sm text-muted-foreground">
              {details.health_effects}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Safe Levels</h4>
            <p className="text-sm text-muted-foreground">
              {details.safe_levels}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}