import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { GlassCard, GlassCardContent, GlassCardHeader } from "@/components/ui/GlassCard";

interface BalanceChartProps {
  title: string;
  status: string;
  savings: {
    percentage: number;
    change: string;
    type: 'increase' | 'decrease';
  };
  balance: {
    amount: string;
    change: string;
    type: 'increase' | 'decrease';
  };
  period: string;
}

export const BalanceChart = ({
  title,
  status,
  savings,
  balance,
  period
}: BalanceChartProps): JSX.Element => {
  return (
    <GlassCard className="relative overflow-hidden col-span-2 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/20 shadow-xl hover:shadow-2xl transition-all duration-300">
      {/* Glowing border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-lg"></div>
      
      <GlassCardHeader className="relative pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="heading-md font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{title}</h3>
            <Badge variant="outline" className="bg-success/20 text-success border-success/30 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 bg-success rounded-full mr-1"></div>
              {status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground/80">{period}</div>
        </div>
      </GlassCardHeader>
      
      <GlassCardContent className="relative pt-0">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Savings */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <p className="text-sm text-muted-foreground/80 mb-2 font-medium">Savings</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-success">{savings.percentage}%</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                savings.type === 'increase' ? 'text-success' : 'text-error'
              }`}>
                {savings.type === 'increase' ? 
                  <TrendingUp className="h-4 w-4" /> : 
                  <TrendingDown className="h-4 w-4" />
                }
                <span>{savings.change}</span>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground/80 mb-2 font-medium">Balance</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{balance.amount}</span>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                balance.type === 'increase' ? 'text-success' : 'text-error'
              }`}>
                {balance.type === 'increase' ? 
                  <TrendingUp className="h-4 w-4" /> : 
                  <TrendingDown className="h-4 w-4" />
                }
                <span>{balance.change}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Chart Area */}
        <div className="h-36 w-full bg-gradient-to-br from-muted/10 to-muted/5 rounded-2xl flex items-end justify-center px-6 pb-6 border border-border/20 backdrop-blur-sm">
          <svg width="100%" height="100" viewBox="0 0 400 100" className="text-primary">
            <defs>
              <linearGradient id="balanceChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            
            {/* Filled area under the line */}
            <path
              d="M20 70 L50 55 L80 60 L110 45 L140 50 L170 35 L200 40 L230 30 L260 35 L290 25 L320 30 L350 20 L380 25 L380 100 L20 100 Z"
              fill="url(#balanceChartGradient)"
            />
            
            {/* Main line with enhanced styling */}
            <path
              d="M20 70 L50 55 L80 60 L110 45 L140 50 L170 35 L200 40 L230 30 L260 35 L290 25 L320 30 L350 20 L380 25"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-lg"
            />
            
            {/* Enhanced data points */}
            <circle cx="50" cy="55" r="4" fill="hsl(var(--primary))" className="drop-shadow-md" />
            <circle cx="110" cy="45" r="4" fill="hsl(var(--primary))" className="drop-shadow-md" />
            <circle cx="170" cy="35" r="4" fill="hsl(var(--primary))" className="drop-shadow-md" />
            <circle cx="230" cy="30" r="4" fill="hsl(var(--primary))" className="drop-shadow-md" />
            <circle cx="290" cy="25" r="4" fill="hsl(var(--primary))" className="drop-shadow-md" />
            <circle cx="350" cy="20" r="4" fill="hsl(var(--primary))" className="drop-shadow-md" />
          </svg>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
};
