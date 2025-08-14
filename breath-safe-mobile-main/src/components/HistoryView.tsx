import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, TrendingUp, Download } from "lucide-react";

interface HistoryEntry {
  id: string;
  date: string;
  time: string;
  location: string;
  aqi: number;
  pm25: number;
  pm10: number;
}

const mockHistory: HistoryEntry[] = [
  {
    id: "1",
    date: "2024-01-15",
    time: "14:30",
    location: "San Francisco, CA",
    aqi: 42,
    pm25: 15.2,
    pm10: 28.5,
  },
  {
    id: "2",
    date: "2024-01-15",
    time: "09:15",
    location: "San Francisco, CA",
    aqi: 38,
    pm25: 12.8,
    pm10: 24.1,
  },
  {
    id: "3",
    date: "2024-01-14",
    time: "18:45",
    location: "Oakland, CA",
    aqi: 55,
    pm25: 18.9,
    pm10: 32.7,
  },
  {
    id: "4",
    date: "2024-01-14",
    time: "12:20",
    location: "San Francisco, CA",
    aqi: 47,
    pm25: 16.1,
    pm10: 29.3,
  },
];

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return "aqi-good";
  if (aqi <= 100) return "aqi-moderate";
  if (aqi <= 150) return "aqi-unhealthy-sensitive";
  if (aqi <= 200) return "aqi-unhealthy";
  if (aqi <= 300) return "aqi-very-unhealthy";
  return "aqi-hazardous";
};

const getAQILabel = (aqi: number) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

export default function HistoryView() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Air Quality History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your air quality exposure over time
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              7-Day Average
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">46</div>
            <p className="text-xs text-muted-foreground">Good air quality</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">Since last month</p>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Readings</h2>
        {mockHistory.map((entry) => (
          <Card key={entry.id} className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary"
                      className={`bg-${getAQIColor(entry.aqi)} text-white border-0 text-xs`}
                    >
                      AQI {entry.aqi}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {getAQILabel(entry.aqi)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{entry.location}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.date} at {entry.time}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">PM2.5:</span> {entry.pm25}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">PM10:</span> {entry.pm10}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      <Button variant="outline" className="w-full">
        Load More Records
      </Button>
    </div>
  );
}