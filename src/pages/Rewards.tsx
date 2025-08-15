import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  DollarSign, 
  Gift, 
  Star, 
  Flame, 
  Target, 
  Award,
  TrendingUp,
  Calendar,
  Zap,
  Crown,
  Medal,
  GiftIcon,
  CreditCard,
  ExternalLink
} from "lucide-react";
import { useToast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_reward: number;
  unlocked: boolean;
  unlocked_at?: string;
  progress: number;
  max_progress: number;
}

interface Streak {
  id: string;
  name: string;
  description: string;
  current_streak: number;
  max_streak: number;
  last_activity: string;
  icon: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  method: 'paypal' | 'mpesa';
  status: 'pending' | 'approved' | 'rejected';
  paypal_email?: string;
  mpesa_phone?: string;
  created_at: string;
}

interface GiftCard {
  id: string;
  name: string;
  value: number;
  points_required: number;
  image_url?: string;
  available: boolean;
}

export default function Rewards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: 0,
    method: 'paypal' as 'paypal' | 'mpesa',
    paypal_email: '',
    mpesa_phone: ''
  });
  const [loading, setLoading] = useState(true);

  // Mock achievements data - in production, this would come from a database
  const [achievements] = useState<Achievement[]>([
    {
      id: '1',
      name: 'First Steps',
      description: 'Complete your first air quality reading',
      icon: '🎯',
      points_reward: 50,
      unlocked: true,
      unlocked_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 1,
      max_progress: 1
    },
    {
      id: '2',
      name: 'Air Quality Enthusiast',
      description: 'Complete 10 air quality readings',
      icon: '⭐',
      points_reward: 100,
      unlocked: true,
      unlocked_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 15,
      max_progress: 10
    },
    {
      id: '3',
      name: 'Weekly Warrior',
      description: 'Check air quality for 7 consecutive days',
      icon: '🔥',
      points_reward: 200,
      unlocked: false,
      progress: 5,
      max_progress: 7
    },
    {
      id: '4',
      name: 'Monthly Master',
      description: 'Check air quality for 30 consecutive days',
      icon: '👑',
      points_reward: 500,
      unlocked: false,
      progress: 5,
      max_progress: 30
    },
    {
      id: '5',
      name: 'Good Air Guardian',
      description: 'Record 50 days with good air quality (AQI ≤ 50)',
      icon: '🌱',
      points_reward: 300,
      unlocked: false,
      progress: 12,
      max_progress: 50
    },
    {
      id: '6',
      name: 'Point Collector',
      description: 'Earn 10,000 total points',
      icon: '💎',
      points_reward: 1000,
      unlocked: false,
      progress: 2150,
      max_progress: 10000
    }
  ]);

  // Mock streaks data
  const [streaks] = useState<Streak[]>([
    {
      id: '1',
      name: 'Daily Check-in',
      description: 'Consecutive days checking air quality',
      current_streak: 5,
      max_streak: 12,
      last_activity: new Date().toISOString(),
      icon: '🔥'
    },
    {
      id: '2',
      name: 'Good Air Days',
      description: 'Consecutive days with good air quality',
      current_streak: 3,
      max_streak: 8,
      last_activity: new Date().toISOString(),
      icon: '🌱'
    },
    {
      id: '3',
      name: 'Weekly Reports',
      description: 'Consecutive weeks generating reports',
      current_streak: 2,
      max_streak: 4,
      last_activity: new Date().toISOString(),
      icon: '📊'
    }
  ]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchWithdrawalRequests();
      fetchGiftCards();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawalRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching withdrawal requests:', error);
    }
  };

  const fetchGiftCards = async () => {
    try {
      // For now, we'll use mock data. In production, this would come from a database
      const mockGiftCards: GiftCard[] = [
        {
          id: '1',
          name: 'Carrefour Kenya',
          value: 1000,
          points_required: 10000,
          available: true
        },
        {
          id: '2',
          name: 'Carrefour Kenya',
          value: 2000,
          points_required: 20000,
          available: true
        },
        {
          id: '3',
          name: 'Carrefour Kenya',
          value: 5000,
          points_required: 50000,
          available: true
        }
      ];
      setGiftCards(mockGiftCards);
    } catch (error: any) {
      console.error('Error fetching gift cards:', error);
    }
  };

  const handleWithdrawal = async () => {
    if (!user || !profile) return;

    const requiredPoints = withdrawalForm.amount * 10000; // $0.1 per 1000 points = 10000 points per $1
    
    if (profile.total_points < requiredPoints) {
      toast({
        title: "Insufficient Points",
        description: `You need ${requiredPoints.toLocaleString()} points to withdraw $${withdrawalForm.amount}`,
        variant: "destructive",
      });
      return;
    }

    if (profile.total_points < 500000) {
      toast({
        title: "Minimum Points Required",
        description: "You need at least 500,000 points to withdraw funds",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: withdrawalForm.amount,
          method: withdrawalForm.method,
          paypal_email: withdrawalForm.method === 'paypal' ? withdrawalForm.paypal_email : null,
          mpesa_phone: withdrawalForm.method === 'mpesa' ? withdrawalForm.mpesa_phone : null,
          status: 'pending'
        });

      if (error) throw error;

      // Deduct points from user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_points: profile.total_points - requiredPoints })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Withdrawal Request Submitted",
        description: "Your withdrawal request has been submitted and is pending approval",
      });

      setShowWithdrawalModal(false);
      setWithdrawalForm({ amount: 0, method: 'paypal', paypal_email: '', mpesa_phone: '' });
      fetchProfile(); // Refresh profile to show updated points
      fetchWithdrawalRequests();
    } catch (error: any) {
      console.error('Error submitting withdrawal request:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive",
      });
    }
  };

  const redeemGiftCard = async (giftCard: GiftCard) => {
    if (!user || !profile) return;

    if (profile.total_points < giftCard.points_required) {
      toast({
        title: "Insufficient Points",
        description: `You need ${giftCard.points_required.toLocaleString()} points to redeem this gift card`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Deduct points from user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_points: profile.total_points - giftCard.points_required })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Gift Card Redeemed!",
        description: `You've successfully redeemed a ${giftCard.name} gift card worth ${giftCard.value} KES`,
      });

      fetchProfile(); // Refresh profile to show updated points
    } catch (error: any) {
      console.error('Error redeeming gift card:', error);
      toast({
        title: "Error",
        description: "Failed to redeem gift card",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  const currencyRewards = (profile.total_points / 1000) * 0.1;
  const canWithdraw = profile.total_points >= 500000;

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Rewards & Achievements
        </h1>
        <p className="text-muted-foreground">
          Track your progress, unlock achievements, and redeem rewards
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              {profile.total_points.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">
              <DollarSign className="w-8 h-8 mx-auto mb-2" />
              ${currencyRewards.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Currency Rewards</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">
              <Star className="w-8 h-8 mx-auto mb-2" />
              {achievements.filter(a => a.unlocked).length}
            </div>
            <p className="text-sm text-muted-foreground">Achievements</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-500 mb-2">
              <Flame className="w-8 h-8 mx-auto mb-2" />
              {Math.max(...streaks.map(s => s.current_streak))}
            </div>
            <p className="text-sm text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Current Streaks */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Current Streaks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {streaks.map((streak) => (
                  <Card key={streak.id} className="border-2 border-orange-200 bg-orange-50/50">
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl mb-2">{streak.icon}</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {streak.current_streak}
                      </div>
                      <div className="text-sm font-medium mb-1">{streak.name}</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {streak.description}
                      </div>
                      <div className="text-xs text-orange-600">
                        Best: {streak.max_streak}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements
                  .filter(a => a.unlocked)
                  .slice(0, 4)
                  .map((achievement) => (
                    <Card key={achievement.id} className="border-2 border-yellow-200 bg-yellow-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <div className="font-semibold">{achievement.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {achievement.description}
                            </div>
                            <div className="text-xs text-yellow-600 mt-1">
                              +{achievement.points_reward} points
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                All Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className={`border-2 ${
                  achievement.unlocked 
                    ? 'border-green-200 bg-green-50/50' 
                    : 'border-gray-200 bg-gray-50/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold">{achievement.name}</div>
                          <Badge variant={achievement.unlocked ? "default" : "secondary"}>
                            {achievement.unlocked ? "Unlocked" : "Locked"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {achievement.description}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.max_progress}</span>
                          </div>
                          <Progress 
                            value={(achievement.progress / achievement.max_progress) * 100} 
                            className="h-2"
                          />
                        </div>
                        {achievement.unlocked && (
                          <div className="text-xs text-green-600 mt-2">
                            Unlocked on {new Date(achievement.unlocked_at!).toLocaleDateString()}
                          </div>
                        )}
                        <div className="text-sm text-blue-600 mt-2">
                          Reward: +{achievement.points_reward} points
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          {/* Currency Rewards */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Currency Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-green-500">
                  ${currencyRewards.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  $0.1 per 1000 points • Withdrawable at 500,000 points
                </p>
                {canWithdraw ? (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    🎉 Ready to withdraw!
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                    {500000 - profile.total_points} points needed to withdraw
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gift Cards */}
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GiftIcon className="h-5 w-5 text-purple-500" />
                Gift Cards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {giftCards.map((giftCard) => (
                  <Card key={giftCard.id} className="border-2 hover:border-primary transition-colors">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-500 mb-2">
                        {giftCard.name}
                      </div>
                      <div className="text-lg font-semibold mb-2">
                        {giftCard.value} KES
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        {giftCard.points_required.toLocaleString()} points
                      </div>
                      <Button
                        onClick={() => redeemGiftCard(giftCard)}
                        disabled={!giftCard.available || profile.total_points < giftCard.points_required}
                        className="w-full"
                        variant={giftCard.available && profile.total_points >= giftCard.points_required ? "default" : "outline"}
                      >
                        {giftCard.available && profile.total_points >= giftCard.points_required ? "Redeem" : "Insufficient Points"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Withdrawal Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canWithdraw ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      You have enough points to withdraw! Click the button below to request a withdrawal.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => setShowWithdrawalModal(true)}
                    className="w-full"
                    size="lg"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Request Withdrawal
                  </Button>
                </div>
              ) : (
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-700">
                    You need at least 500,000 points to withdraw funds. 
                    Current points: {profile.total_points.toLocaleString()}
                  </p>
                </div>
              )}

              {withdrawalRequests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Recent Withdrawal Requests</h4>
                  {withdrawalRequests.map((request) => (
                    <Card key={request.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">${request.amount}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.method === 'paypal' ? 'PayPal' : 'M-Pesa'} • {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge 
                            variant={request.status === 'approved' ? 'default' : request.status === 'pending' ? 'secondary' : 'destructive'}
                          >
                            {request.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Request Withdrawal</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWithdrawalModal(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Amount (USD)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter amount"
                  className="w-full p-2 border rounded-md mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Points required: {(withdrawalForm.amount * 10000).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  value={withdrawalForm.method}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, method: e.target.value as 'paypal' | 'mpesa' })}
                  className="w-full p-2 border rounded-md mt-1"
                >
                  <option value="paypal">PayPal</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>

              {withdrawalForm.method === 'paypal' && (
                <div>
                  <label className="text-sm font-medium">PayPal Email</label>
                  <input
                    type="email"
                    value={withdrawalForm.paypal_email}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paypal_email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full p-2 border rounded-md mt-1"
                  />
                </div>
              )}

              {withdrawalForm.method === 'mpesa' && (
                <div>
                  <label className="text-sm font-medium">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    value={withdrawalForm.mpesa_phone}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, mpesa_phone: e.target.value })}
                    placeholder="+254700000000"
                    className="w-full p-2 border rounded-md mt-1"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleWithdrawal}
                  className="flex-1"
                  disabled={!withdrawalForm.amount || 
                    (withdrawalForm.method === 'paypal' && !withdrawalForm.paypal_email) ||
                    (withdrawalForm.method === 'mpesa' && !withdrawalForm.mpesa_phone)
                  }
                >
                  Submit Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
