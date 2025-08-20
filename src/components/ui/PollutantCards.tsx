import { Card, CardContent } from "@/components/ui/card";
import { getPollutantInfo, createPollutantCards } from "@/lib/airQualityUtils";
import { AirQualityData } from "@/hooks/useAirQuality";

interface PollutantCardsProps {
  data: AirQualityData;
  onPollutantClick: (name: string, value: number, unit: string) => void;
}

export const PollutantCards = ({ data, onPollutantClick }: PollutantCardsProps): JSX.Element => {
  const pollutantCards = createPollutantCards(data);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pollutantCards.map((pollutant) => {
        const info = getPollutantInfo(pollutant.code, pollutant.value);
        const isAboveThreshold = pollutant.threshold && pollutant.value > pollutant.threshold;
        
        return (
          <Card 
            key={pollutant.code}
            className={`cursor-pointer transition-all hover:scale-105 ${
              isAboveThreshold ? 'border-red-300 bg-red-50/50' : 'border-border'
            }`}
            onClick={() => onPollutantClick(info.label, pollutant.value, info.unit)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold mb-2">{info.label}</div>
              <div className={`text-3xl font-bold ${isAboveThreshold ? 'text-red-600' : 'text-primary'}`}>
                {pollutant.value !== null ? pollutant.value.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">{info.unit}</div>
              {pollutant.threshold && (
                <div className={`text-xs mt-2 ${
                  isAboveThreshold ? 'text-red-600' : 'text-green-600'
                }`}>
                  {isAboveThreshold ? 'Above threshold' : 'Below threshold'}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
