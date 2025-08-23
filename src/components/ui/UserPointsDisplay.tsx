import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface UserPointsDisplayProps {
  userPoints: number;
  currencyRewards: number;
  canWithdraw: boolean;
}

export const UserPointsDisplay = ({ userPoints, currencyRewards, canWithdraw }: UserPointsDisplayProps): JSX.Element => (
  <Card className="floating-card shadow-card border-0">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Your Points
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{userPoints.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Points</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">${currencyRewards.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">Currency Rewards</div>
        </div>
        <div className="text-center">
          <Badge variant={canWithdraw ? "default" : "secondary"}>
            {canWithdraw ? "Can Withdraw" : "Need 500K Points"}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
);
