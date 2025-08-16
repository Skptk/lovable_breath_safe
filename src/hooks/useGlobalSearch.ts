import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'aqi' | 'app' | 'shop' | 'pollutant' | 'health';
  action?: string;
  data?: any;
}

// AQI and pollutant information for search
const AQI_SEARCH_DATA: SearchResult[] = [
  {
    id: 'aqi-good',
    title: 'Good Air Quality (0-50 AQI)',
    description: 'Air quality is satisfactory and poses little or no health risk',
    category: 'aqi',
    action: 'learn_more'
  },
  {
    id: 'aqi-moderate',
    title: 'Moderate Air Quality (51-100 AQI)',
    description: 'Air quality is acceptable but may be concerning for sensitive individuals',
    category: 'aqi',
    action: 'learn_more'
  },
  {
    id: 'aqi-unhealthy-sensitive',
    title: 'Unhealthy for Sensitive Groups (101-150 AQI)',
    description: 'Sensitive people may experience health effects',
    category: 'aqi',
    action: 'learn_more'
  },
  {
    id: 'aqi-unhealthy',
    title: 'Unhealthy Air Quality (151-200 AQI)',
    description: 'Everyone may begin to experience health effects',
    category: 'aqi',
    action: 'learn_more'
  },
  {
    id: 'aqi-very-unhealthy',
    title: 'Very Unhealthy Air Quality (201-300 AQI)',
    description: 'Health alert - everyone may experience serious health effects',
    category: 'aqi',
    action: 'learn_more'
  },
  {
    id: 'aqi-hazardous',
    title: 'Hazardous Air Quality (301+ AQI)',
    description: 'Emergency conditions - entire population likely to be affected',
    category: 'aqi',
    action: 'learn_more'
  },
  {
    id: 'pm25',
    title: 'PM2.5 - Fine Particulate Matter',
    description: 'Tiny particles that can penetrate deep into lungs and bloodstream',
    category: 'pollutant',
    action: 'learn_more'
  },
  {
    id: 'pm10',
    title: 'PM10 - Coarse Particulate Matter',
    description: 'Larger particles that can irritate eyes, nose, and throat',
    category: 'pollutant',
    action: 'learn_more'
  },
  {
    id: 'no2',
    title: 'NO₂ - Nitrogen Dioxide',
    description: 'Gas that can cause respiratory problems and asthma',
    category: 'pollutant',
    action: 'learn_more'
  },
  {
    id: 'o3',
    title: 'O₃ - Ground-level Ozone',
    description: 'Can trigger asthma and reduce lung function',
    category: 'pollutant',
    action: 'learn_more'
  },
  {
    id: 'so2',
    title: 'SO₂ - Sulfur Dioxide',
    description: 'Can cause respiratory symptoms and breathing difficulties',
    category: 'pollutant',
    action: 'learn_more'
  },
  {
    id: 'co',
    title: 'CO - Carbon Monoxide',
    description: 'Colorless, odorless gas that can be harmful in high concentrations',
    category: 'pollutant',
    action: 'learn_more'
  }
];

// App feature keywords
const APP_SEARCH_DATA: SearchResult[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'View real-time air quality data and personalized insights',
    category: 'app',
    action: 'navigate',
    data: { route: 'dashboard' }
  },
  {
    id: 'history',
    title: 'Air Quality History',
    description: 'Track your air quality readings over time',
    category: 'app',
    action: 'navigate',
    data: { route: 'history' }
  },
  {
    id: 'map',
    title: 'Air Quality Map',
    description: 'Explore air quality data in your area on an interactive map',
    category: 'app',
    action: 'navigate',
    data: { route: 'map' }
  },
  {
    id: 'rewards',
    title: 'Rewards & Points',
    description: 'Earn points for checking air quality and redeem rewards',
    category: 'app',
    action: 'navigate',
    data: { route: 'rewards' }
  },
  {
    id: 'store',
    title: 'Store',
    description: 'Browse air purifiers, filters, and health products',
    category: 'app',
    action: 'navigate',
    data: { route: 'store' }
  },
  {
    id: 'profile',
    title: 'Profile Settings',
    description: 'Manage your account, preferences, and notifications',
    category: 'app',
    action: 'navigate',
    data: { route: 'profile' }
  },
  {
    id: 'location',
    title: 'Location Services',
    description: 'Enable location to get accurate air quality data',
    category: 'app',
    action: 'enable_location'
  },
  {
    id: 'notifications',
    title: 'Air Quality Alerts',
    description: 'Get notified when air quality changes in your area',
    category: 'app',
    action: 'learn_more'
  }
];

// Health tips and recommendations
const HEALTH_SEARCH_DATA: SearchResult[] = [
  {
    id: 'health-tips-poor-air',
    title: 'Health Tips for Poor Air Quality',
    description: 'Stay indoors, use air purifiers, limit outdoor exercise',
    category: 'health',
    action: 'learn_more'
  },
  {
    id: 'health-tips-good-air',
    title: 'Make the Most of Good Air Quality',
    description: 'Perfect time for outdoor activities and exercise',
    category: 'health',
    action: 'learn_more'
  },
  {
    id: 'indoor-air-quality',
    title: 'Improve Indoor Air Quality',
    description: 'Use plants, ventilation, and air purifiers to clean indoor air',
    category: 'health',
    action: 'learn_more'
  },
  {
    id: 'sensitive-groups',
    title: 'Sensitive Groups Protection',
    description: 'Special precautions for children, elderly, and people with conditions',
    category: 'health',
    action: 'learn_more'
  }
];

export const useGlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Fetch store products for search
  const { data: storeProducts = [] } = useQuery({
    queryKey: ['store-products-search'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_products')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      
      return data?.map(product => ({
        id: `product-${product.id}`,
        title: product.name,
        description: product.description,
        category: 'shop' as const,
        action: 'view_product',
        data: { product }
      })) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000 // 15 minutes
  });

  // Combine all search data
  const allSearchData = useMemo(() => [
    ...AQI_SEARCH_DATA,
    ...APP_SEARCH_DATA,
    ...HEALTH_SEARCH_DATA,
    ...storeProducts
  ], [storeProducts]);

  // Filter search results based on query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    
    return allSearchData.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.category === 'pollutant' && query.includes(item.id)) ||
      (item.category === 'aqi' && (query.includes('aqi') || query.includes('air quality')))
    ).slice(0, 8); // Limit to 8 results for better UX
  }, [searchQuery, allSearchData]);

  // Get popular/suggested searches
  const popularSearches = useMemo(() => [
    'AQI levels',
    'PM2.5',
    'Air purifiers',
    'Dashboard',
    'Health tips',
    'Location settings'
  ], []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    popularSearches,
    isSearchOpen,
    setIsSearchOpen,
    hasResults: searchResults.length > 0
  };
};
