import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  pollutant: {
    name: string;
    value: number;
    unit: string;
  } | null;
  onClose: () => void;
}

export default function PollutantModal({ 
  pollutant, 
  onClose 
}: PollutantModalProps) {
  const [details, setDetails] = useState<PollutantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pollutant) {
      fetchPollutantDetails();
    }
  }, [pollutant]);

  const fetchPollutantDetails = async () => {
    try {
      // Map pollutant names to codes
      const pollutantCodeMap: Record<string, string> = {
        'PM2.5': 'PM25',
        'PM10': 'PM10',
        'NO₂': 'NO2',
        'SO₂': 'SO2',
        'CO': 'CO',
        'O₃': 'O3'
      };

      const pollutantCode = pollutantCodeMap[pollutant.name];
      if (!pollutantCode) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('pollutant_details')
        .select('*')
        .eq('pollutant_code', pollutantCode)
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

  // Don't render if no pollutant is selected
  if (!pollutant) {
    return null;
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-card border-0">
          <DialogHeader>
            <DialogTitle>Loading Pollutant Information</DialogTitle>
            <DialogDescription>
              Fetching detailed information for {pollutant.name}...
            </DialogDescription>
          </DialogHeader>
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
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-gradient-card border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>{pollutant.name} Information</DialogTitle>
            <DialogDescription>
              Basic pollutant information and current levels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">{pollutant.value.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">{pollutant.unit}</div>
            </div>
            <p className="text-muted-foreground text-center">
              No detailed information available for this pollutant.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const safetyLevel = getSafetyLevel(details.pollutant_code, pollutant.value);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-card border-0 max-w-md">
        <DialogHeader>
          <DialogTitle>{pollutant.name} Information</DialogTitle>
          <DialogDescription>
            Detailed information about {pollutant.name} and its health effects
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Value */}
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold">{pollutant.value.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">{pollutant.unit}</div>
            <Badge className={`${safetyLevel.color} text-white`}>
              {safetyLevel.level}
            </Badge>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{details.description}</p>
          </div>

          {/* Health Effects */}
          <div>
            <h4 className="font-medium mb-2">Health Effects</h4>
            <p className="text-sm text-muted-foreground">{details.health_effects}</p>
          </div>

          {/* Safe Levels */}
          <div>
            <h4 className="font-medium mb-2">Safe Levels</h4>
            <p className="text-sm text-muted-foreground">{details.safe_levels}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}