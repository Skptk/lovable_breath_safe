import { useState, useEffect, useMemo, memo } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Info,
  Wind,
  Cloud,
  Droplets,
  Zap,
  Flame,
  Eye
} from "lucide-react";
import { getAQIColor, getAQILabel } from "@/config/maps";

interface PollutantData {
  name: string;
  value: number;
  unit: string;
  description: string;
  healthEffects: string[];
  sources: string[];
  icon: React.ReactNode;
  color: string;
  category: 'particulate' | 'gas' | 'weather';
}

interface AQIDataChartsProps {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  timestamp: string;
}

// CRITICAL: Memoize component to prevent unnecessary re-renders
const AQIDataCharts = memo(function AQIDataCharts({ 
  aqi, 
  pm25, 
  pm10, 
  no2, 
  so2, 
  co, 
  o3, 
  timestamp 
}: AQIDataChartsProps): JSX.Element {
  const [selectedPollutant, setSelectedPollutant] = useState<PollutantData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Remove mock historical data generation - only use real data from database
  // const generateHistoricalData = (currentValue: number, pollutantName: string) => {
  //   const data = [];
  //   const now = new Date();
  //   
  //   for (let i = 23; i >= 0; i--) {
  //     const time = new Date(now.getTime() - i * 60 * 60 * 1000); // Last 24 hours
  //     const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
  //     const value = Math.max(0, currentValue * (1 + variation));
  //     
  //     data.push({
  //       time: time.toLocaleTimeString('en-US', { 
  //         hour: '2-digit', 
  //         minute: '2-digit',
  //         hour12: false 
  //       }),
  //       value: Math.round(value * 100) / 100,
  //       pollutant: pollutantName
  //     });
  //   }
  //   
  //   return data;
  // };

  // Function to get real historical data from database (to be implemented)
  const getRealHistoricalData = async (pollutantName: string): Promise<any[]> => {
    // TODO: Implement real historical data fetching from database
    // This should query the air_quality_readings table for historical data
    console.log(`[AQIDataCharts] Fetching real historical data for ${pollutantName}`);
    return [];
  };

  const pollutants: PollutantData[] = [
    {
      name: 'PM2.5',
      value: pm25,
      unit: 'μg/m³',
      description: 'Fine particulate matter smaller than 2.5 micrometers in diameter',
      healthEffects: [
        'Can penetrate deep into the lungs and bloodstream',
        'Linked to respiratory and cardiovascular diseases',
        'May cause premature death in people with heart or lung disease'
      ],
      sources: [
        'Vehicle emissions',
        'Industrial processes',
        'Burning of fossil fuels',
        'Wildfires and dust storms'
      ],
      icon: <Cloud className="h-5 w-5" />,
      color: '#3B82F6',
      category: 'particulate'
    },
    {
      name: 'PM10',
      value: pm10,
      unit: 'μg/m³',
      description: 'Coarse particulate matter smaller than 10 micrometers in diameter',
      healthEffects: [
        'Can irritate the eyes, nose, and throat',
        'May cause coughing and difficulty breathing',
        'Can aggravate existing respiratory conditions'
      ],
      sources: [
        'Road dust',
        'Construction activities',
        'Agricultural operations',
        'Industrial emissions'
      ],
      icon: <Cloud className="h-5 w-5" />,
      color: '#10B981',
      category: 'particulate'
    },
    {
      name: 'NO₂',
      value: no2,
      unit: 'ppb',
      description: 'Nitrogen dioxide, a reddish-brown gas with a sharp, biting odor',
      healthEffects: [
        'Can cause respiratory irritation and inflammation',
        'May increase susceptibility to respiratory infections',
        'Can aggravate asthma and other respiratory conditions'
      ],
      sources: [
        'Vehicle exhaust',
        'Power plants',
        'Industrial boilers',
        'Gas stoves and heaters'
      ],
      icon: <Wind className="h-5 w-5" />,
      color: '#F59E0B',
      category: 'gas'
    },
    {
      name: 'SO₂',
      value: so2,
      unit: 'ppb',
      description: 'Sulfur dioxide, a colorless gas with a pungent, irritating odor',
      healthEffects: [
        'Can cause breathing difficulties and respiratory irritation',
        'May aggravate asthma and other respiratory conditions',
        'Can cause eye irritation and throat discomfort'
      ],
      sources: [
        'Burning of coal and oil',
        'Industrial processes',
        'Volcanic eruptions',
        'Ship emissions'
      ],
      icon: <Flame className="h-5 w-5" />,
      color: '#EF4444',
      category: 'gas'
    },
    {
      name: 'CO',
      value: co,
      unit: 'ppb',
      description: 'Carbon monoxide, a colorless, odorless, and tasteless gas',
      healthEffects: [
        'Can reduce oxygen delivery to the body',
        'May cause headaches, dizziness, and confusion',
        'High levels can be fatal'
      ],
      sources: [
        'Vehicle exhaust',
        'Burning of fossil fuels',
        'Industrial processes',
        'Residential heating'
      ],
      icon: <Zap className="h-5 w-5" />,
      color: '#8B5CF6',
      category: 'gas'
    },
    {
      name: 'O₃',
      value: o3,
      unit: 'ppb',
      description: 'Ground-level ozone, a harmful air pollutant and greenhouse gas',
      healthEffects: [
        'Can cause respiratory irritation and inflammation',
        'May reduce lung function and cause breathing difficulties',
        'Can aggravate asthma and other respiratory conditions'
      ],
      sources: [
        'Chemical reactions between pollutants in sunlight',
        'Vehicle emissions',
        'Industrial emissions',
        'Natural sources'
      ],
      icon: <Eye className="h-5 w-5" />,
      color: '#06B6D4',
      category: 'gas'
    }
  ];

  const getPollutantStatus = (value: number, pollutant: string) => {
    switch (pollutant.toLowerCase()) {
      case 'pm2.5':
        if (value <= 12) return { status: 'Good', color: 'text-green-600', severity: 'low' };
        if (value <= 35.4) return { status: 'Moderate', color: 'text-yellow-600', severity: 'medium' };
        if (value <= 55.4) return { status: 'Unhealthy for Sensitive Groups', color: 'text-orange-600', severity: 'high' };
        if (value <= 150.4) return { status: 'Unhealthy', color: 'text-red-600', severity: 'very-high' };
        if (value <= 250.4) return { status: 'Very Unhealthy', color: 'text-purple-600', severity: 'hazardous' };
        return { status: 'Hazardous', color: 'text-red-800', severity: 'extreme' };
      case 'pm10':
        if (value <= 54) return { status: 'Good', color: 'text-green-600', severity: 'low' };
        if (value <= 154) return { status: 'Moderate', color: 'text-yellow-600', severity: 'medium' };
        if (value <= 254) return { status: 'Unhealthy for Sensitive Groups', color: 'text-orange-600', severity: 'high' };
        if (value <= 354) return { status: 'Unhealthy', color: 'text-red-600', severity: 'very-high' };
        if (value <= 424) return { status: 'Very Unhealthy', color: 'text-purple-600', severity: 'hazardous' };
        return { status: 'Hazardous', color: 'text-red-800', severity: 'extreme' };
      case 'no2':
        if (value <= 53) return { status: 'Good', color: 'text-green-600', severity: 'low' };
        if (value <= 100) return { status: 'Moderate', color: 'text-yellow-600', severity: 'medium' };
        if (value <= 360) return { status: 'Unhealthy for Sensitive Groups', color: 'text-orange-600', severity: 'high' };
        if (value <= 649) return { status: 'Unhealthy', color: 'text-red-600', severity: 'very-high' };
        if (value <= 1249) return { status: 'Very Unhealthy', color: 'text-purple-600', severity: 'hazardous' };
        return { status: 'Hazardous', color: 'text-red-800', severity: 'extreme' };
      case 'o3':
        if (value <= 54) return { status: 'Good', color: 'text-green-600', severity: 'low' };
        if (value <= 70) return { status: 'Moderate', color: 'text-yellow-600', severity: 'medium' };
        if (value <= 85) return { status: 'Unhealthy for Sensitive Groups', color: 'text-orange-600', severity: 'high' };
        if (value <= 105) return { status: 'Unhealthy', color: 'text-red-600', severity: 'very-high' };
        if (value <= 200) return { status: 'Very Unhealthy', color: 'text-purple-600', severity: 'hazardous' };
        return { status: 'Hazardous', color: 'text-red-800', severity: 'extreme' };
      default: return { status: 'Unknown', color: 'text-slate-600', severity: 'low' };
    }
  };

  const handlePollutantClick = (pollutant: PollutantData) => {
    setSelectedPollutant(pollutant);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPollutant(null);
  };

  return (
    <>
      {/* Main AQI Card */}
      <GlassCard className="floating-card shadow-card border-0 mb-6">
        <GlassCardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-black text-primary">Air Quality Index</h2>
          </div>
          <p className="text-muted-foreground">
            Last updated: {new Date(timestamp).toLocaleString()}
          </p>
        </GlassCardHeader>
        <GlassCardContent className="text-center space-y-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div 
                className="text-6xl font-bold mb-2"
                style={{ color: getAQIColor(aqi) }}
              >
                {aqi}
              </div>
              <Badge 
                variant="outline" 
                className="px-4 py-2 text-sm font-semibold"
                style={{ 
                  borderColor: getAQIColor(aqi), 
                  color: getAQIColor(aqi),
                  backgroundColor: `${getAQIColor(aqi)}10`
                }}
              >
                {getAQILabel(aqi)}
              </Badge>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Pollutant Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pollutants.map((pollutant) => {
          const status = getPollutantStatus(pollutant.value, pollutant.name);
          // const historicalData = generateHistoricalData(pollutant.value, pollutant.name);
          
          return (
            <GlassCard 
              key={pollutant.name}
              className="shadow-card hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
              onClick={() => handlePollutantClick(pollutant)}
            >
              <GlassCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${pollutant.color}20` }}>
                      <div style={{ color: pollutant.color }}>
                        {pollutant.icon}
                      </div>
                    </div>
                    <div>
                      <GlassCardTitle className="text-lg font-bold">{pollutant.name}</GlassCardTitle>
                      <p className="text-sm text-muted-foreground">{pollutant.unit}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={status.color}
                    style={{ borderColor: status.color }}
                  >
                    {status.status}
                  </Badge>
                </div>
              </GlassCardHeader>
              <GlassCardContent className="pt-0">
                {/* Mini Chart */}
                <div className="h-24 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[]}>
                      <defs>
                        <linearGradient id={`gradient-${pollutant.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={pollutant.color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={pollutant.color} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={pollutant.color}
                        strokeWidth={2}
                        fill={`url(#gradient-${pollutant.name})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Current Value */}
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: pollutant.color }}>
                    {pollutant.value.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current reading
                  </p>
                </div>
              </GlassCardContent>
            </GlassCard>
          );
        })}
      </div>

      {/* Pollutant Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPollutant?.icon}
              {selectedPollutant?.name} - Detailed Analysis
            </DialogTitle>
          </DialogHeader>
          
          {selectedPollutant && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-3xl font-bold mb-2" style={{ color: selectedPollutant.color }}>
                  {selectedPollutant.value.toFixed(2)} {selectedPollutant.unit}
                </div>
                <Badge 
                  variant="outline" 
                  className={getPollutantStatus(selectedPollutant.value, selectedPollutant.name).color}
                  style={{ borderColor: getPollutantStatus(selectedPollutant.value, selectedPollutant.name).color }}
                >
                  {getPollutantStatus(selectedPollutant.value, selectedPollutant.name).status}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{selectedPollutant.description}</p>
              </div>

              {/* Health Effects */}
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Health Effects
                </h3>
                <ul className="space-y-2">
                  {selectedPollutant.healthEffects.map((effect, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">{effect}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sources */}
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Common Sources
                </h3>
                <ul className="space-y-2">
                  {selectedPollutant.sources.map((source, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">{source}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Historical Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">24-Hour Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#6B7280"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#6B7280"
                        fontSize={12}
                        label={{ 
                          value: `${selectedPollutant.name} (${selectedPollutant.unit})`, 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#F9FAFB' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={selectedPollutant.color}
                        strokeWidth={3}
                        dot={{ fill: selectedPollutant.color, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: selectedPollutant.color, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Information */}
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Pollutant Category</h3>
                <Badge variant="secondary" className="capitalize">
                  {selectedPollutant.category}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  This pollutant is classified as {selectedPollutant.category} matter
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

export default AQIDataCharts;
