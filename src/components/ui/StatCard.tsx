import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  chart?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export const StatCard = ({ 
  title, 
  value, 
  change, 
  icon, 
  chart, 
  subtitle,
  className = ""
}: StatCardProps): JSX.Element => {
  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-success';
      case 'decrease':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return <TrendingUp className="h-3 w-3" />;
      case 'decrease':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card className={`border-0 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {icon && (
                <div className="w-8 h-8 rounded-ds-small bg-primary/10 flex items-center justify-center text-primary">
                  {icon}
                </div>
              )}
              <p className="body-sm text-muted-foreground font-medium">{title}</p>
            </div>
            
            <div className="mb-2">
              <h3 className="text-2xl font-bold text-foreground">{value}</h3>
              {subtitle && (
                <p className="body-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>

            {change && (
              <div className={`flex items-center gap-1 body-sm ${getChangeColor(change.type)}`}>
                {getChangeIcon(change.type)}
                <span>{change.value}</span>
              </div>
            )}
          </div>

          {chart && (
            <div className="ml-4 flex-shrink-0">
              {chart}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Mini chart component for stat cards
export const MiniChart = ({ className = "" }: { className?: string }) => (
  <div className={`w-16 h-8 ${className}`}>
    <svg width="64" height="32" viewBox="0 0 64 32" className="text-primary">
      <path
        d="M0 20 L8 16 L16 22 L24 12 L32 18 L40 8 L48 14 L56 6 L64 10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
