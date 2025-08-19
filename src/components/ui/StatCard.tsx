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
    <Card className={`relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${className}`}>
      {/* Glowing border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-lg"></div>
      
      <CardContent className="relative p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {icon && (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary shadow-lg backdrop-blur-sm border border-primary/20">
                  {icon}
                </div>
              )}
              <p className="body-sm text-muted-foreground/80 font-medium">{title}</p>
            </div>
            
            <div className="mb-3">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{value}</h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground/70 mt-1">{subtitle}</p>
              )}
            </div>

            {change && (
              <div className={`flex items-center gap-2 text-sm font-medium ${getChangeColor(change.type)}`}>
                {getChangeIcon(change.type)}
                <span>{change.value}</span>
              </div>
            )}
          </div>

          {chart && (
            <div className="sm:ml-4 flex-shrink-0 self-center sm:self-start">
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
  <div className={`w-20 h-12 ${className}`}>
    <svg width="80" height="48" viewBox="0 0 80 48" className="text-primary">
      {/* Gradient background area */}
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      
      {/* Filled area under the line */}
      <path
        d="M0 40 L10 32 L20 36 L30 24 L40 30 L50 20 L60 26 L70 18 L80 22 L80 48 L0 48 Z"
        fill="url(#chartGradient)"
      />
      
      {/* Main line */}
      <path
        d="M0 40 L10 32 L20 36 L30 24 L40 30 L50 20 L60 26 L70 18 L80 22"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-lg"
      />
      
      {/* Data points */}
      <circle cx="10" cy="32" r="3" fill="hsl(var(--primary))" className="drop-shadow-md" />
      <circle cx="30" cy="24" r="3" fill="hsl(var(--primary))" className="drop-shadow-md" />
      <circle cx="50" cy="20" r="3" fill="hsl(var(--primary))" className="drop-shadow-md" />
      <circle cx="70" cy="18" r="3" fill="hsl(var(--primary))" className="drop-shadow-md" />
    </svg>
  </div>
);
