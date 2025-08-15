import { Card, CardContent } from "@/components/ui/card";
import { getAQIColor, getAQILabel } from "@/lib/airQualityUtils";

interface AQIDisplayProps {
  aqi: number;
  timestamp: string;
}

export const AQIDisplay = ({ aqi, timestamp }: AQIDisplayProps): JSX.Element => (
  <Card className="bg-gradient-card shadow-card border-0">
    <CardContent className="p-6">
      <div className="text-center space-y-4">
        <div className={`text-8xl font-bold ${getAQIColor(aqi)}`}>
          {aqi}
        </div>
        <div className="text-xl font-semibold">
          {getAQILabel(aqi)}
        </div>
        <p className="text-sm text-muted-foreground">
          Last updated: {timestamp}
        </p>
      </div>
    </CardContent>
  </Card>
);
