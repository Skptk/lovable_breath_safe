import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ExternalLink, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
            // Use the actual API key
            const apiKey = '56ab74b487631610f9b44a6e51fe72f0';
            
            // If no API key is available, skip the API call and use coordinates
            if (!apiKey || apiKey === 'YOUR_API_KEY') {
              console.log('OpenWeatherMap API key not available, using coordinates only');
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
      <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-card rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Air Purifiers
        </h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          Recommended for {userLocation}
        </p>
      </div>

      {/* Local Retailers Notice */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Local Retailers</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Check local electronics stores, home improvement centers, and department stores near you for immediate availability and to avoid shipping costs.
          </p>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="space-y-4">
        {products.map((product) => (
          <Card key={product.id} className="bg-gradient-card shadow-card border-0">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mb-3">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{product.rating}</span>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                      {product.retailer}
                    </Badge>
                  </div>
                </div>
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg bg-muted"
                />
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-muted-foreground">
                  <div>Coverage: {product.coverage_area}</div>
                  <div className="font-semibold text-foreground">{product.price_range}</div>
                </div>
              </div>
              
              <Button
                onClick={() => handleProductClick(product.affiliate_url)}
                className="w-full bg-primary hover:bg-primary/90 gap-2"
              >
                View on {product.retailer}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Disclaimer */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            * Prices and availability may vary. We may earn a commission from purchases made through affiliate links. 
            This helps support the development of this app while providing you with quality product recommendations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}