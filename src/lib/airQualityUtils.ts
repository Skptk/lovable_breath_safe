// Helper functions for AQI display
export const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return "text-green-500";
  if (aqi <= 100) return "text-yellow-500";
  if (aqi <= 150) return "text-orange-500";
  if (aqi <= 200) return "text-red-500";
  if (aqi <= 300) return "text-purple-500";
  return "text-red-800";
};

export const getAQILabel = (aqi: number): string => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

// Helper function to get pollutant display info
export const getPollutantInfo = (code: string, value: number) => {
  const pollutantMap: Record<string, { label: string; unit: string; icon?: string }> = {
    'PM25': { label: "PM2.5", unit: "µg/m³" },
    'PM10': { label: "PM10", unit: "µg/m³" },
    'PM1': { label: "PM1", unit: "µg/m³" },
    'NO2': { label: "NO₂", unit: "µg/m³" },
    'SO2': { label: "SO₂", unit: "µg/m³" },
    'CO': { label: "CO", unit: "mg/m³" },
    'O3': { label: "O₃", unit: "µg/m³" },
    'TEMPERATURE': { label: "Temperature", unit: "°C" },
    'HUMIDITY': { label: "Humidity", unit: "%" },
    'PM003': { label: "PM0.3", unit: "particles/cm³" }
  };
  
  return pollutantMap[code] || { label: code, unit: "N/A" };
};

// Create pollutant cards data based on available data
export const createPollutantCards = (data: { 
  pm25: number; 
  pm10: number; 
  no2: number;
  so2: number;
  co: number;
  o3: number;
  environmental?: { temperature: number; humidity: number } 
}) => {
  if (!data) return [];
  
  const pollutants = [
    { code: 'PM25', value: data.pm25, threshold: 12, showIfZero: false },
    { code: 'PM10', value: data.pm10, threshold: 54, showIfZero: false },
    { code: 'PM1', value: data.pm25 * 0.7, threshold: 8, showIfZero: false }, // Estimate PM1 from PM2.5
    { code: 'NO2', value: data.no2, threshold: 53, showIfZero: false },
    { code: 'SO2', value: data.so2, threshold: 35, showIfZero: false },
    { code: 'CO', value: data.co, threshold: 4.4, showIfZero: false },
    { code: 'O3', value: data.o3, threshold: 54, showIfZero: false },
    { code: 'TEMPERATURE', value: data.environmental?.temperature || null, threshold: null, showIfZero: true },
    { code: 'HUMIDITY', value: data.environmental?.humidity || null, threshold: null, showIfZero: true },
    { code: 'PM003', value: data.pm25 * 2, threshold: null, showIfZero: false } // Estimate PM0.3 from PM2.5
  ];
  
  // Filter pollutants based on data availability
  return pollutants.filter(pollutant => {
    if (pollutant.showIfZero) {
      // Only show environmental sensors if they have real data
      return pollutant.value !== null && pollutant.value !== undefined;
    }
    // Only show pollutant sensors if they have meaningful data
    return pollutant.value > 0;
  });
};
