import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { getAQIColor, getAQILabel } from "@/lib/airQualityUtils";

interface AQIDisplayProps {
  aqi: number;
  timestamp: string;
}

export const AQIDisplay = ({ aqi, timestamp }: AQIDisplayProps): JSX.Element => (
  <GlassCard className="floating-card shadow-card border-0">
    <GlassCardContent className="p-6">
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
    </GlassCardContent>
  </GlassCard>
);
