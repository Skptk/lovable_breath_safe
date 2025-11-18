import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import { 
  ShoppingBag, 
  Star, 
  DollarSign, 
  Gift, 
  TrendingUp, 
  Users, 
  Award,
  Calendar,
  Zap,
  Crown,
  Medal,
  GiftIcon,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Filter,
  Search
} from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import React from 'react'; // Added missing import for React


interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  image: string;
  category: 'air-purifier' | 'dehumidifier' | 'humidifier' | 'air-filter' | 'monitor' | 'accessory';
  rating: number;
  reviewCount: number;
  affiliateLink: string;
  store: 'amazon' | 'aliexpress' | 'alibaba' | 'other';
  inStock: boolean;
  fastShipping?: boolean;
  bestSeller?: boolean;
}

const products: Product[] = [
  {
    id: '1',
    name: 'HEPA Air Purifier Pro',
    description: 'Advanced HEPA filtration system removes 99.97% of airborne particles including dust, pollen, pet dander, and smoke.',
    price: '$89.99',
    originalPrice: '$129.99',
    image: '/placeholder.svg',
    category: 'air-purifier',
    rating: 4.8,
    reviewCount: 1247,
    affiliateLink: 'https://amazon.com/air-purifier-pro',
    store: 'amazon',
    inStock: true,
    fastShipping: true,
    bestSeller: true
  },
  {
    id: '2',
    name: 'Smart Dehumidifier 50L',
    description: 'Large capacity dehumidifier with smart humidity control, perfect for basements and large rooms.',
    price: '$199.99',
    image: '/placeholder.svg',
    category: 'dehumidifier',
    rating: 4.6,
    reviewCount: 892,
    affiliateLink: 'https://aliexpress.com/smart-dehumidifier',
    store: 'aliexpress',
    inStock: true,
    fastShipping: true
  },
  {
    id: '3',
    name: 'Ultrasonic Humidifier',
    description: 'Quiet ultrasonic humidifier with adjustable mist levels and auto-shutoff for optimal humidity control.',
    price: '$45.99',
    originalPrice: '$59.99',
    image: '/placeholder.svg',
    category: 'humidifier',
    rating: 4.4,
    reviewCount: 567,
    affiliateLink: 'https://amazon.com/ultrasonic-humidifier',
    store: 'amazon',
    inStock: true
  },
  {
    id: '4',
    name: 'Premium Air Filter Set',
    description: 'High-quality air filters compatible with most HVAC systems, captures allergens and improves indoor air quality.',
    price: '$29.99',
    image: '/placeholder.svg',
    category: 'air-filter',
    rating: 4.7,
    reviewCount: 2341,
    affiliateLink: 'https://alibaba.com/premium-air-filters',
    store: 'alibaba',
    inStock: true,
    bestSeller: true
  },
  {
    id: '5',
    name: 'Air Quality Monitor',
    description: 'Real-time air quality sensor that measures PM2.5, PM10, CO2, temperature, and humidity levels.',
    price: '$79.99',
    image: '/placeholder.svg',
    category: 'monitor',
    rating: 4.9,
    reviewCount: 1567,
    affiliateLink: 'https://amazon.com/air-quality-monitor',
    store: 'amazon',
    inStock: true,
    fastShipping: true,
    bestSeller: true
  },
  {
    id: '6',
    name: 'Portable Air Purifier',
    description: 'Compact and portable air purifier perfect for small rooms, offices, and travel use.',
    price: '$34.99',
    originalPrice: '$49.99',
    image: '/placeholder.svg',
    category: 'air-purifier',
    rating: 4.3,
    reviewCount: 423,
    affiliateLink: 'https://aliexpress.com/portable-air-purifier',
    store: 'aliexpress',
    inStock: true
  },
  {
    id: '7',
    name: 'Mini Dehumidifier',
    description: 'Small dehumidifier ideal for bathrooms, closets, and small spaces up to 200 sq ft.',
    price: '$39.99',
    image: '/placeholder.svg',
    category: 'dehumidifier',
    rating: 4.2,
    reviewCount: 298,
    affiliateLink: 'https://alibaba.com/mini-dehumidifier',
    store: 'alibaba',
    inStock: true
  },
  {
    id: '8',
    name: 'Essential Oil Diffuser',
    description: 'Aromatherapy diffuser with LED mood lighting, perfect for creating a relaxing atmosphere.',
    price: '$24.99',
    image: '/placeholder.svg',
    category: 'accessory',
    rating: 4.5,
    reviewCount: 756,
    affiliateLink: 'https://amazon.com/essential-oil-diffuser',
    store: 'amazon',
    inStock: true
  }
];

const categories = [
  { value: 'all', label: 'All Products', icon: ShoppingBag },
  { value: 'air-purifier', label: 'Air Purifiers', icon: Zap },
  { value: 'dehumidifier', label: 'Dehumidifiers', icon: DollarSign },
  { value: 'humidifier', label: 'Humidifiers', icon: Gift },
  { value: 'air-filter', label: 'Air Filters', icon: Crown },
  { value: 'monitor', label: 'Monitors', icon: Medal },
  { value: 'accessory', label: 'Accessories', icon: ShoppingBag }
];

const stores = [
  { value: 'all', label: 'All Stores' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'aliexpress', label: 'AliExpress' },
  { value: 'alibaba', label: 'Alibaba' }
];

interface StoreProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function Store({ showMobileMenu, onMobileMenuToggle }: StoreProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  // Filter products based on search, category, and store
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStore = selectedStore === 'all' || product.store === selectedStore;
    
    return matchesSearch && matchesCategory && matchesStore;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return parseFloat(a.price.replace('$', '')) - parseFloat(b.price.replace('$', ''));
      case 'price-high':
        return parseFloat(b.price.replace('$', '')) - parseFloat(a.price.replace('$', ''));
      case 'rating':
        return b.rating - a.rating;
      case 'reviews':
        return b.reviewCount - a.reviewCount;
      default:
        return 0;
    }
  });

  const handleProductClick = (product: Product) => {
    // Open affiliate link in new tab
    window.open(product.affiliateLink, '_blank');
  };

  const getStoreBadgeColor = (store: string) => {
    switch (store) {
      case 'amazon': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'aliexpress': return 'bg-red-100 text-red-800 border-red-300';
      case 'alibaba': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.value === category);
    return categoryData ? categoryData.icon : ShoppingBag;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStoreColor = (store: string) => {
    switch (store.toLowerCase()) {
      case 'amazon': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'aliexpress': return 'bg-red-100 text-red-800 border-red-300';
      case 'alibaba': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="page-container">
      <Header 
        title="Air Quality Store"
        subtitle="Discover premium products to improve your indoor air quality"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />
      <div className="page-content space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="text-center space-y-2 sm:space-y-3 lg:space-y-4 w-full max-w-full overflow-hidden">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Air Quality Store
        </h1>
        <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground px-2">
          Discover premium products to improve your indoor air quality
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 sm:space-y-4 lg:space-y-5 w-full max-w-full overflow-hidden">
        {/* Search Bar */}
        <div className="relative w-full max-w-full">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
          <Input
            placeholder="Search for air purifiers, filters, monitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 sm:pl-12 lg:pl-14 h-9 sm:h-10 lg:h-11 xl:h-12 text-sm sm:text-base lg:text-lg"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <SelectItem key={category.value} value={category.value} className="text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      {category.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.value} value={store.value} className="text-sm sm:text-base">
                  {store.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured" className="text-sm sm:text-base">Featured</SelectItem>
              <SelectItem value="price-low" className="text-sm sm:text-base">Price: Low to High</SelectItem>
              <SelectItem value="price-high" className="text-sm sm:text-base">Price: High to Low</SelectItem>
              <SelectItem value="rating" className="text-sm sm:text-base">Highest Rated</SelectItem>
              <SelectItem value="reviews" className="text-sm sm:text-base">Most Reviews</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="w-full h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 w-full max-w-full overflow-hidden">
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
          {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} found
        </p>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
          Showing {Math.min(sortedProducts.length, 20)} of {sortedProducts.length}
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 w-full max-w-full overflow-hidden">
        {sortedProducts.map((product) => (
          <GlassCard key={product.id} className="floating-card group hover:shadow-lg transition-all duration-300 cursor-pointer w-full max-w-full overflow-hidden">
            <GlassCardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-4 sm:pt-5 lg:pt-6">
              <div className="relative w-full">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-40 sm:h-48 lg:h-56 xl:h-64 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                {product.bestSeller && (
                  <Badge className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-orange-500 text-white text-[10px] sm:text-xs lg:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1">
                    Best Seller
                  </Badge>
                )}
                {product.fastShipping && (
                  <Badge className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-green-500 text-white text-[10px] sm:text-xs lg:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1">
                    Fast Shipping
                  </Badge>
                )}
                {!product.inStock && (
                  <Badge variant="destructive" className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[10px] sm:text-xs lg:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1">
                    Out of Stock
                  </Badge>
                )}
              </div>
            </GlassCardHeader>
            
            <GlassCardContent className="space-y-2 sm:space-y-3 lg:space-y-4 px-3 sm:px-4 lg:px-6 pb-4 sm:pb-5 lg:pb-6">
              {/* Category and Store */}
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px] sm:text-xs lg:text-sm">
                  <div className="flex items-center gap-1">
                    {React.createElement(getCategoryIcon(product.category), { className: "h-3 w-3 sm:h-4 sm:w-4" })}
                    <span className="truncate">{categories.find(c => c.value === product.category)?.label}</span>
                  </div>
                </Badge>
                <Badge variant="outline" className={`text-[10px] sm:text-xs lg:text-sm ${getStoreBadgeColor(product.store)}`}>
                  {product.store.charAt(0).toUpperCase() + product.store.slice(1)}
                </Badge>
              </div>

              {/* Product Name */}
              <h3 className="font-semibold text-base sm:text-lg lg:text-xl xl:text-2xl line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground line-clamp-3">
                {product.description}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 ${
                        i < Math.floor(product.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs sm:text-sm lg:text-base text-muted-foreground">
                  ({product.reviewCount.toLocaleString()})
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-primary">
                  {product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-xs sm:text-sm lg:text-base text-muted-foreground line-through">
                    {product.originalPrice}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <Button 
                onClick={() => handleProductClick(product)}
                className="w-full group-hover:bg-primary group-hover:text-white transition-colors h-9 sm:h-10 lg:h-11 xl:h-12 text-xs sm:text-sm lg:text-base font-semibold"
                variant="outline"
              >
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-1.5 sm:mr-2" />
                <span className="truncate">View on {product.store.charAt(0).toUpperCase() + product.store.slice(1)}</span>
              </Button>
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>

      {/* No Results */}
      {sortedProducts.length === 0 && (
        <div className="text-center py-8 sm:py-12 lg:py-16 w-full max-w-full overflow-hidden">
          <div className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 lg:mb-6">🛍️</div>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground mb-2">No products available at the moment.</p>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground">Check back later for new rewards and products!</p>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-center py-6 sm:py-8 lg:py-10 xl:py-12 border-t border-border w-full max-w-full overflow-hidden">
        <p className="text-[10px] sm:text-xs lg:text-sm xl:text-base text-muted-foreground px-2 sm:px-4 lg:px-6">
          💡 <strong>Affiliate Disclosure:</strong> This page contains affiliate links. 
          We may earn a commission when you make a purchase through these links at no additional cost to you.
        </p>
      </div>
      </div>
    </div>
  );
}