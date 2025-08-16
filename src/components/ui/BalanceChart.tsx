import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

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
    <Card className="col-span-2 border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="heading-md font-semibold">{title}</h3>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              <div className="w-1.5 h-1.5 bg-success rounded-full mr-1"></div>
              {status}
            </Badge>
          </div>
          <div className="body-sm text-muted-foreground">{period}</div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Savings */}
          <div>
            <p className="body-sm text-muted-foreground mb-1">Savings</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{savings.percentage}%</span>
              <div className={`flex items-center gap-1 body-sm ${
                savings.type === 'increase' ? 'text-success' : 'text-error'
              }`}>
                {savings.type === 'increase' ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingDown className="h-3 w-3" />
                }
                <span>{savings.change}</span>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div>
            <p className="body-sm text-muted-foreground mb-1">Balance</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{balance.amount}</span>
              <div className={`flex items-center gap-1 body-sm ${
                balance.type === 'increase' ? 'text-success' : 'text-error'
              }`}>
                {balance.type === 'increase' ? 
                  <TrendingUp className="h-3 w-3" /> : 
                  <TrendingDown className="h-3 w-3" />
                }
                <span>{balance.change}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-32 w-full bg-muted/20 rounded-ds-small flex items-end justify-center px-4 pb-4">
          <svg width="100%" height="80" viewBox="0 0 400 80" className="text-primary">
            <path
              d="M20 60 L50 45 L80 50 L110 35 L140 40 L170 25 L200 30 L230 20 L260 25 L290 15 L320 20 L350 10 L380 15"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Data points */}
            <circle cx="50" cy="45" r="3" fill="currentColor" />
            <circle cx="110" cy="35" r="3" fill="currentColor" />
            <circle cx="170" cy="25" r="3" fill="currentColor" />
            <circle cx="230" cy="20" r="3" fill="currentColor" />
            <circle cx="290" cy="15" r="3" fill="currentColor" />
            <circle cx="350" cy="10" r="3" fill="currentColor" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};
