import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ExternalLink, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Footer from '@/components/Footer';

interface Product {
  id: string;
  name: string;
  description: string;
  price_range: string;
  affiliate_url: string;
  retailer: string;
  image_url: string;
  rating: number;
  coverage_area: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    getUserLocation();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_products')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Use environment variable for API key
            const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
            
            // If no API key is available, skip the API call and use coordinates
            if (!apiKey || apiKey.trim() === '') {
              setUserLocation(`Your Location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
              return;
            }

            const response = await fetch(
              `https://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=1&appid=${apiKey}`
            );
            
            if (!response.ok) {
              throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            setUserLocation(data[0]?.name || 'Your Location');
          } catch (error) {
            console.error('Error getting city name:', error);
            // Fallback to coordinates if API fails
            setUserLocation(`Your Location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
          }
        },
        () => setUserLocation('Your Location')
      );
    }
  };

  const handleProductClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 pb-24 w-full max-w-full overflow-x-hidden">
        <div className="animate-pulse space-y-3 sm:space-y-4 lg:space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 sm:h-32 lg:h-40 bg-card rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Sidebar would be here but Products is a separate route */}
      <div className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 xl:p-12 max-w-7xl mx-auto space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 w-full max-w-full overflow-hidden">
        {/* Header */}
        <div className="w-full max-w-full overflow-hidden">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Air Purifiers
          </h1>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground mt-1 sm:mt-2 lg:mt-3 flex items-center gap-1.5 sm:gap-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 flex-shrink-0" />
            <span className="truncate">Recommended for {userLocation}</span>
          </p>
        </div>

      {/* Local Retailers Notice */}
      <GlassCard className="floating-card border-0 w-full max-w-full overflow-hidden">
        <GlassCardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-4">
            <MapPin className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary flex-shrink-0" />
            <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-heading">Local Retailers</h3>
          </div>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground">
            Check local electronics stores, home improvement centers, and department stores near you for immediate availability and to avoid shipping costs.
          </p>
        </GlassCardContent>
      </GlassCard>

      {/* Products Grid */}
      <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
        {products.length === 0 ? (
          <GlassCard className="floating-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-lg sm:text-xl lg:text-2xl xl:text-3xl">No Products Available</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                We're currently updating our product recommendations. Please check back soon!
              </p>
            </GlassCardContent>
          </GlassCard>
        ) : (
          products.map((product) => (
            <GlassCard key={product.id} className="floating-card border-0 w-full max-w-full overflow-hidden">
              <GlassCardHeader className="pb-3 sm:pb-4 lg:pb-5 px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 lg:gap-6">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <GlassCardTitle className="text-lg sm:text-xl lg:text-2xl xl:text-3xl mb-2 sm:mb-3 break-words">{product.name}</GlassCardTitle>
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-3 sm:mb-4 break-words">
                      {product.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        <span className="text-sm sm:text-base lg:text-lg font-medium">{product.rating}</span>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs sm:text-sm lg:text-base">
                        {product.retailer}
                      </Badge>
                    </div>
                  </div>
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    loading="lazy"
                    className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 object-cover rounded-lg bg-muted flex-shrink-0"
                  />
                </div>
              </GlassCardHeader>
              
              <GlassCardContent className="pt-0 px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-5">
                  <div className="text-xs sm:text-sm lg:text-base text-muted-foreground">
                    <div className="mb-1">Coverage: {product.coverage_area}</div>
                    <div className="font-semibold text-foreground text-sm sm:text-base lg:text-lg">{product.price_range}</div>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleProductClick(product.affiliate_url)}
                  className="w-full bg-primary hover:bg-primary/90 gap-2 h-9 sm:h-10 lg:h-11 xl:h-12 text-sm sm:text-base lg:text-lg font-semibold"
                >
                  View on {product.retailer}
                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </Button>
              </GlassCardContent>
            </GlassCard>
          ))
        )}
      </div>

        {/* Disclaimer */}
        <GlassCard className="floating-card border-0 w-full max-w-full overflow-hidden">
          <GlassCardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
            <p className="text-[10px] sm:text-xs lg:text-sm xl:text-base text-muted-foreground">
              * Prices and availability may vary. We may earn a commission from purchases made through affiliate links. 
              This helps support the development of this app while providing you with quality product recommendations.
            </p>
          </GlassCardContent>
        </GlassCard>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}