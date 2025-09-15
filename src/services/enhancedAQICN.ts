/**
 * Enhanced AQICN Service with Intelligent Station Selection
 * 
 * This service provides:
 * 1. Global station discovery by country
 * 2. Distance-based intelligent station selection
 * 3. Automatic fallback to second-closest station
 * 4. Station data caching for performance
 * 5. Real-time air quality data from official monitoring stations worldwide
 */

export interface EnhancedAQICNStation {
  uid: number;
  name: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  aqi: number;
  distance: number; // Distance from user location in km
  country: string;
  lastUpdate: string;
}

export interface EnhancedAQICNData {
  aqi: number;
  city: string;
  stationName: string;
  distance: number;
  country: string;
  dominantPollutant: string;
  pollutants: {
    pm25: number | null;
    pm10: number | null;
    no2: number | null;
    so2: number | null;
    co: number | null;
    o3: number | null;
  };
  environmental: {
    temperature: number | null;
    humidity: number | null;
    pressure: number | null;
  };
  coordinates: {
    user: { lat: number; lon: number };
    station: { lat: number; lon: number };
  };
  timestamp: string;
  dataSource: 'AQICN';
  error?: boolean;
  message?: string;
}

export interface StationCache {
  country: string;
  stations: EnhancedAQICNStation[];
  timestamp: number;
}

export class EnhancedAQICNService {
  private static instance: EnhancedAQICNService;
  private cache = new Map<string, StationCache>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private readonly MAX_DISTANCE = 100; // Maximum distance in km to consider a station
  private readonly API_BASE_URL = 'https://api.waqi.info';

  private constructor() {}

  public static getInstance(): EnhancedAQICNService {
    if (!EnhancedAQICNService.instance) {
      EnhancedAQICNService.instance = new EnhancedAQICNService();
    }
    return EnhancedAQICNService.instance;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  /**
   * Get country code from coordinates using reverse geocoding
   */
  private async getCountryFromCoordinates(lat: number, lon: number): Promise<string> {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      return data.countryCode || 'US'; // Default to US if not found
    } catch (error) {
      console.warn(`⚠️ Failed to get country for coordinates ${lat}, ${lon}:`, error);
      return 'US'; // Default fallback
    }
  }

  /**
   * Search for monitoring stations in a specific country
   */
  private async searchStationsByCountry(country: string, apiKey: string): Promise<EnhancedAQICNStation[]> {
    try {
      console.log(`🔍 Searching AQICN stations in country: ${country}`);
      
      const searchUrl = `${this.API_BASE_URL}/search/?token=${apiKey}&keyword=${country}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`AQICN search API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'ok' || !data.data) {
        console.warn(`⚠️ No stations found for country ${country}`);
        return [];
      }
      
      // Transform and filter valid stations
      const stations: EnhancedAQICNStation[] = data.data
        .filter((station: any) => 
          station.aqi && 
          station.aqi !== '-' && 
          !isNaN(Number(station.aqi)) && 
          Number(station.aqi) > 0 &&
          station.station &&
          station.station.geo &&
          station.station.geo.length === 2
        )
        .map((station: any) => ({
          uid: station.uid,
          name: station.station.name,
          coordinates: {
            lat: station.station.geo[0],
            lon: station.station.geo[1]
          },
          aqi: Number(station.aqi),
          distance: 0, // Will be calculated later
          country: country,
          lastUpdate: station.time?.s || new Date().toISOString()
        }));
      
      console.log(`✅ Found ${stations.length} valid stations for ${country}`);
      return stations;
    } catch (error) {
      console.error(`❌ Failed to search stations for ${country}:`, error);
      return [];
    }
  }

  /**
   * Get detailed air quality data from specific station
   */
  private async getStationDetails(stationId: number, apiKey: string): Promise<any> {
    try {
      const detailUrl = `${this.API_BASE_URL}/feed/@${stationId}/?token=${apiKey}`;
      const response = await fetch(detailUrl);
      
      if (!response.ok) {
        throw new Error(`Station detail API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'ok' || !data.data || data.data.aqi <= 0) {
        return null;
      }
      
      return data.data;
    } catch (error) {
      console.warn(`⚠️ Failed to get details for station ${stationId}:`, error);
      return null;
    }
  }

  /**
   * Extract pollutant values from AQICN response
   */
  private extractPollutantValue(pollutant: { v: number } | undefined): number | null {
    return pollutant?.v ? Math.round(pollutant.v * 10) / 10 : null;
  }

  /**
   * Get cached stations for a country
   */
  private getCachedStations(country: string): EnhancedAQICNStation[] | null {
    const cached = this.cache.get(country);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`🎯 Using cached stations for ${country} (${cached.stations.length} stations)`);
      return cached.stations;
    }
    return null;
  }

  /**
   * Cache stations for a country
   */
  private cacheStations(country: string, stations: EnhancedAQICNStation[]): void {
    this.cache.set(country, {
      country,
      stations,
      timestamp: Date.now()
    });
  }

  /**
   * Find closest monitoring stations with intelligent fallback
   */
  public async findClosestStations(
    lat: number,
    lon: number,
    apiKey: string,
    maxStations: number = 2
  ): Promise<EnhancedAQICNStation[]> {
    try {
      // Step 1: Get country for user's location
      const country = await this.getCountryFromCoordinates(lat, lon);
      console.log(`🗺️ User location detected in: ${country}`);
      
      // Step 2: Check cache first
      let stations = this.getCachedStations(country);
      
      // Step 3: Fetch stations if not cached
      if (!stations) {
        stations = await this.searchStationsByCountry(country, apiKey);
        if (stations.length > 0) {
          this.cacheStations(country, stations);
        }
      }
      
      if (stations.length === 0) {
        console.warn(`⚠️ No monitoring stations available for ${country}`);
        return [];
      }
      
      // Step 4: Calculate distances and sort by proximity
      const stationsWithDistance = stations.map(station => ({
        ...station,
        distance: this.calculateDistance(lat, lon, station.coordinates.lat, station.coordinates.lon)
      })).filter(station => station.distance <= this.MAX_DISTANCE); // Filter by max distance
      
      // Sort by distance (closest first)
      stationsWithDistance.sort((a, b) => a.distance - b.distance);
      
      // Return top N closest stations
      const closestStations = stationsWithDistance.slice(0, maxStations);
      
      console.log(`📊 Found ${closestStations.length} nearby stations:`);
      closestStations.forEach((station, index) => {
        console.log(`  ${index + 1}. ${station.name} - ${station.distance.toFixed(2)}km (AQI: ${station.aqi})`);
      });
      
      return closestStations;
    } catch (error) {
      console.error('❌ Error finding closest stations:', error);
      return [];
    }
  }

  /**
   * Get air quality data with intelligent station fallback
   */
  public async getAirQualityData(
    lat: number,
    lon: number,
    apiKey: string
  ): Promise<EnhancedAQICNData | null> {
    try {
      console.log(`🌍 Getting enhanced AQICN data for coordinates: ${lat}, ${lon}`);
      
      // Find closest stations
      const closestStations = await this.findClosestStations(lat, lon, apiKey, 2);
      
      if (closestStations.length === 0) {
        console.error('❌ No monitoring stations found in acceptable range');
        return {
          aqi: 0,
          city: 'Unknown Location',
          stationName: 'No Station Available',
          distance: 0,
          country: 'Unknown',
          dominantPollutant: 'unknown',
          pollutants: {
            pm25: null,
            pm10: null,
            no2: null,
            so2: null,
            co: null,
            o3: null
          },
          environmental: {
            temperature: null,
            humidity: null,
            pressure: null
          },
          coordinates: {
            user: { lat, lon },
            station: { lat: 0, lon: 0 }
          },
          timestamp: new Date().toISOString(),
          dataSource: 'AQICN',
          error: true,
          message: '⚠️ No air quality monitoring stations available for your location.'
        };
      }
      
      // Try each station until we get valid data
      for (const station of closestStations) {
        console.log(`🎯 Attempting to get data from: ${station.name} (${station.distance.toFixed(2)}km)`);
        
        const stationData = await this.getStationDetails(station.uid, apiKey);
        
        if (stationData && stationData.aqi > 0) {
          console.log(`✅ Successfully got data from ${station.name}`);
          
          // Extract pollutant data
          const pollutants = {
            pm25: this.extractPollutantValue(stationData.iaqi?.pm25),
            pm10: this.extractPollutantValue(stationData.iaqi?.pm10),
            no2: this.extractPollutantValue(stationData.iaqi?.no2),
            so2: this.extractPollutantValue(stationData.iaqi?.so2),
            co: this.extractPollutantValue(stationData.iaqi?.co),
            o3: this.extractPollutantValue(stationData.iaqi?.o3)
          };
          
          // Extract environmental data
          const environmental = {
            temperature: this.extractPollutantValue(stationData.iaqi?.t),
            humidity: this.extractPollutantValue(stationData.iaqi?.h),
            pressure: this.extractPollutantValue(stationData.iaqi?.p)
          };
          
          // Map dominant pollutant
          let dominantPollutant = stationData.dominentpol || 'unknown';
          const pollutantMapping: Record<string, string> = {
            'pm25': 'PM2.5',
            'pm10': 'PM10',
            'no2': 'NO2',
            'so2': 'SO2',
            'co': 'CO',
            'o3': 'O3'
          };
          
          if (pollutantMapping[dominantPollutant]) {
            dominantPollutant = pollutantMapping[dominantPollutant];
          }
          
          return {
            aqi: Math.min(500, Math.round(stationData.aqi)),
            city: stationData.city?.name || station.name,
            stationName: station.name,
            distance: station.distance,
            country: station.country,
            dominantPollutant,
            pollutants,
            environmental,
            coordinates: {
              user: { lat, lon },
              station: { lat: station.coordinates.lat, lon: station.coordinates.lon }
            },
            timestamp: new Date().toISOString(),
            dataSource: 'AQICN'
          };
        } else {
          console.warn(`⚠️ Station ${station.name} returned invalid data, trying next station...`);
        }
      }
      
      // All stations failed
      console.error('❌ All nearby stations failed to provide valid data');
      return {
        aqi: 0,
        city: 'Unknown Location',
        stationName: 'Data Unavailable',
        distance: 0,
        country: closestStations[0]?.country || 'Unknown',
        dominantPollutant: 'unknown',
        pollutants: {
          pm25: null,
          pm10: null,
          no2: null,
          so2: null,
          co: null,
          o3: null
        },
        environmental: {
          temperature: null,
          humidity: null,
          pressure: null
        },
        coordinates: {
          user: { lat, lon },
          station: { lat: 0, lon: 0 }
        },
        timestamp: new Date().toISOString(),
        dataSource: 'AQICN',
        error: true,
        message: '⚠️ Air quality data temporarily unavailable. Please try again later.'
      };
    } catch (error) {
      console.error('❌ Error getting enhanced AQICN data:', error);
      return null;
    }
  }

  /**
   * Clear cached station data
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ AQICN station cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { countries: number; totalStations: number } {
    let totalStations = 0;
    for (const cached of this.cache.values()) {
      totalStations += cached.stations.length;
    }
    
    return {
      countries: this.cache.size,
      totalStations
    };
  }
}

// Export singleton instance
export const enhancedAQICNService = EnhancedAQICNService.getInstance();