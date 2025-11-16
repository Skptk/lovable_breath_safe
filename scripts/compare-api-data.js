/**
 * Compare AQICN and OpenWeatherMap API data
 * Fetches air quality data from both APIs and compares results
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Try multiple possible environment variable names
const AQICN_API_KEY = process.env.AQICN_API_KEY || process.env.VITE_AQICN_API_KEY;
const OPENWEATHERMAP_API_KEY = process.env.VITE_OPENWEATHERMAP_API_KEY || process.env.OPENWEATHERMAP_API_KEY;

// Nairobi coordinates
const NAIROBI = {
  name: 'Nairobi',
  lat: -1.2921,
  lon: 36.8219,
  country: 'Kenya'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatValue(value, unit = '') {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value.toFixed(1)}${unit}`;
  }
  return String(value);
}

async function fetchAQICNData(lat, lon) {
  if (!AQICN_API_KEY) {
    throw new Error('AQICN_API_KEY not found in environment variables');
  }

  const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQICN_API_KEY}`;
  
  log(colors.cyan, `\n🌍 Fetching AQICN data from: ${url.replace(AQICN_API_KEY, 'YOUR_API_KEY')}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`AQICN API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.status !== 'ok') {
    throw new Error(`AQICN API error: ${data.status}`);
  }

  return data;
}

async function fetchOpenWeatherMapData(lat, lon) {
  if (!OPENWEATHERMAP_API_KEY) {
    throw new Error('OPENWEATHERMAP_API_KEY not found in environment variables');
  }

  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}`;
  
  log(colors.cyan, `\n🌍 Fetching OpenWeatherMap data from: ${url.replace(OPENWEATHERMAP_API_KEY, 'YOUR_API_KEY')}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`OpenWeatherMap API failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  return data;
}

function parseAQICNData(aqicnResponse) {
  const data = aqicnResponse.data;
  const iaqi = data.iaqi || {};
  
  // Extract pollutant values (AQICN uses { v: number } format)
  const extractValue = (pollutant) => {
    if (!pollutant || !pollutant.v) return null;
    return Math.round(pollutant.v * 10) / 10; // Round to 1 decimal
  };

  return {
    source: 'AQICN',
    station: data.city?.name || 'Unknown Station',
    coordinates: data.city?.geo || [null, null],
    aqi: data.aqi || null,
    dominantPollutant: data.dominentpol || 'unknown',
    pollutants: {
      pm25: extractValue(iaqi.pm25),
      pm10: extractValue(iaqi.pm10),
      no2: extractValue(iaqi.no2),
      so2: extractValue(iaqi.so2),
      co: extractValue(iaqi.co),
      o3: extractValue(iaqi.o3),
    },
    environmental: {
      temperature: extractValue(iaqi.t),
      humidity: extractValue(iaqi.h),
      pressure: extractValue(iaqi.p),
      windSpeed: extractValue(iaqi.w),
      windDirection: extractValue(iaqi.wd),
    },
    timestamp: data.time?.s || new Date().toISOString(),
    availablePollutants: Object.keys(iaqi).filter(key => 
      ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'].includes(key)
    ),
  };
}

function parseOpenWeatherMapData(owmResponse) {
  const data = owmResponse.list?.[0];
  if (!data) {
    throw new Error('No air pollution data in OpenWeatherMap response');
  }

  const components = data.components || {};
  
  // OpenWeatherMap AQI is 1-5, convert to standard 0-500 scale for comparison
  const aqiMap = {
    1: 50,   // Good
    2: 100,  // Fair
    3: 150,  // Moderate
    4: 200,  // Poor
    5: 300,  // Very Poor
  };
  
  const standardAQI = aqiMap[data.main.aqi] || null;

  return {
    source: 'OpenWeatherMap',
    coordinates: [owmResponse.coord?.lat || null, owmResponse.coord?.lon || null],
    aqi: data.main.aqi, // Original 1-5 scale
    standardAQI: standardAQI, // Converted to 0-500 scale
    pollutants: {
      pm25: components.pm2_5 ? Math.round(components.pm2_5 * 10) / 10 : null,
      pm10: components.pm10 ? Math.round(components.pm10 * 10) / 10 : null,
      no2: components.no2 ? Math.round(components.no2 * 10) / 10 : null,
      so2: components.so2 ? Math.round(components.so2 * 10) / 10 : null,
      co: components.co ? Math.round(components.co * 10) / 10 : null,
      o3: components.o3 ? Math.round(components.o3 * 10) / 10 : null,
    },
    timestamp: new Date(data.dt * 1000).toISOString(),
    availablePollutants: Object.keys(components).filter(key => 
      ['pm2_5', 'pm10', 'no2', 'so2', 'co', 'o3'].includes(key)
    ),
  };
}

function compareResults(aqicnData, owmData) {
  log(colors.bright, '\n' + '='.repeat(80));
  log(colors.bright, 'COMPARISON RESULTS');
  log(colors.bright, '='.repeat(80));

  // Location comparison
  log(colors.cyan, '\n📍 Location:');
  log(colors.reset, `  AQICN: ${aqicnData.station} [${aqicnData.coordinates[0]}, ${aqicnData.coordinates[1]}]`);
  log(colors.reset, `  OpenWeatherMap: [${owmData.coordinates[0]}, ${owmData.coordinates[1]}]`);

  // AQI comparison
  log(colors.cyan, '\n📊 Air Quality Index (AQI):');
  log(colors.reset, `  AQICN: ${formatValue(aqicnData.aqi)} (0-500 scale)`);
  log(colors.reset, `  OpenWeatherMap: ${formatValue(owmData.aqi)} (1-5 scale) → ${formatValue(owmData.standardAQI)} (0-500 scale)`);
  
  const aqiDiff = aqicnData.aqi && owmData.standardAQI 
    ? Math.abs(aqicnData.aqi - owmData.standardAQI)
    : null;
  if (aqiDiff !== null) {
    const color = aqiDiff < 20 ? colors.green : aqiDiff < 50 ? colors.yellow : colors.red;
    log(color, `  Difference: ${aqiDiff.toFixed(1)} points`);
  }

  // Pollutant comparison
  log(colors.cyan, '\n🧪 Pollutant Comparison (µg/m³):');
  log(colors.reset, '  ' + 'Pollutant'.padEnd(10) + 'AQICN'.padEnd(15) + 'OpenWeatherMap'.padEnd(20) + 'Status');
  log(colors.reset, '  ' + '-'.repeat(65));

  const pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
  const pollutantLabels = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    no2: 'NO₂',
    so2: 'SO₂',
    co: 'CO',
    o3: 'O₃',
  };

  pollutants.forEach(pollutant => {
    const aqicnValue = aqicnData.pollutants[pollutant];
    const owmValue = owmData.pollutants[pollutant];
    
    let status = '';
    let statusColor = colors.reset;
    
    if (aqicnValue !== null && owmValue !== null) {
      const diff = Math.abs(aqicnValue - owmValue);
      const percentDiff = (diff / Math.max(aqicnValue, owmValue)) * 100;
      
      if (percentDiff < 10) {
        status = '✓ Match';
        statusColor = colors.green;
      } else if (percentDiff < 30) {
        status = '~ Close';
        statusColor = colors.yellow;
      } else {
        status = '✗ Different';
        statusColor = colors.red;
      }
    } else if (aqicnValue !== null && owmValue === null) {
      status = 'AQICN only';
      statusColor = colors.blue;
    } else if (aqicnValue === null && owmValue !== null) {
      status = 'OWM only';
      statusColor = colors.magenta;
    } else {
      status = 'Both NULL';
      statusColor = colors.reset;
    }

    log(colors.reset, `  ${pollutantLabels[pollutant].padEnd(10)}${formatValue(aqicnValue).padEnd(15)}${formatValue(owmValue).padEnd(20)}${statusColor}${status}${colors.reset}`);
  });

  // Summary
  log(colors.cyan, '\n📈 Summary:');
  const aqicnAvailable = pollutants.filter(p => aqicnData.pollutants[p] !== null).length;
  const owmAvailable = pollutants.filter(p => owmData.pollutants[p] !== null).length;
  
  log(colors.reset, `  AQICN provides: ${aqicnAvailable}/6 pollutants`);
  log(colors.reset, `  OpenWeatherMap provides: ${owmAvailable}/6 pollutants`);
  
  const missingFromAQICN = pollutants.filter(p => aqicnData.pollutants[p] === null && owmData.pollutants[p] !== null);
  const missingFromOWM = pollutants.filter(p => owmData.pollutants[p] === null && aqicnData.pollutants[p] !== null);
  
  if (missingFromAQICN.length > 0) {
    log(colors.magenta, `  ✓ OpenWeatherMap can fill: ${missingFromAQICN.map(p => pollutantLabels[p]).join(', ')}`);
  }
  if (missingFromOWM.length > 0) {
    log(colors.blue, `  ✓ AQICN can fill: ${missingFromOWM.map(p => pollutantLabels[p]).join(', ')}`);
  }

  // Recommendation
  log(colors.cyan, '\n💡 Recommendation:');
  if (aqicnAvailable < 6 && owmAvailable >= aqicnAvailable) {
    log(colors.green, '  ✓ Using OpenWeatherMap as fallback will provide more complete data');
  } else if (aqicnAvailable === 6) {
    log(colors.green, '  ✓ AQICN provides all pollutants - fallback may not be needed');
  } else {
    log(colors.yellow, '  ⚠ Both sources have missing data - using both provides best coverage');
  }
}

async function main() {
  log(colors.bright, '\n🔬 API Data Comparison Tool');
  log(colors.bright, '='.repeat(80));
  log(colors.reset, `Location: ${NAIROBI.name}, ${NAIROBI.country}`);
  log(colors.reset, `Coordinates: ${NAIROBI.lat}, ${NAIROBI.lon}\n`);

  try {
    // Check API keys
    if (!AQICN_API_KEY) {
      log(colors.red, '❌ AQICN_API_KEY not found in environment variables');
      process.exit(1);
    }
    if (!OPENWEATHERMAP_API_KEY) {
      log(colors.red, '❌ OPENWEATHERMAP_API_KEY not found in environment variables');
      process.exit(1);
    }

    // Fetch data from both APIs
    log(colors.yellow, 'Fetching data from both APIs...\n');
    
    const [aqicnResponse, owmResponse] = await Promise.all([
      fetchAQICNData(NAIROBI.lat, NAIROBI.lon),
      fetchOpenWeatherMapData(NAIROBI.lat, NAIROBI.lon),
    ]);

    // Parse responses
    const aqicnData = parseAQICNData(aqicnResponse);
    const owmData = parseOpenWeatherMapData(owmResponse);

    // Display individual results
    log(colors.bright, '\n' + '='.repeat(80));
    log(colors.bright, 'AQICN API RESULTS');
    log(colors.bright, '='.repeat(80));
    log(colors.reset, JSON.stringify(aqicnData, null, 2));

    log(colors.bright, '\n' + '='.repeat(80));
    log(colors.bright, 'OPENWEATHERMAP API RESULTS');
    log(colors.bright, '='.repeat(80));
    log(colors.reset, JSON.stringify(owmData, null, 2));

    // Compare results
    compareResults(aqicnData, owmData);

    log(colors.bright, '\n' + '='.repeat(80));
    log(colors.green, '✅ Comparison complete!');
    log(colors.bright, '='.repeat(80) + '\n');

  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}`);
    if (error.stack) {
      log(colors.red, error.stack);
    }
    process.exit(1);
  }
}

main();

