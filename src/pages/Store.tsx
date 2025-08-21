import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        title="Air Quality Store"
        subtitle="Discover premium products to improve your indoor air quality"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />
      <div className="flex-1 space-y-card-gap p-4 md:p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="heading-lg bg-gradient-primary bg-clip-text text-transparent">
          Air Quality Store
        </h1>
        <p className="body-md text-muted-foreground">
          Discover premium products to improve your indoor air quality
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search for air purifiers, filters, monitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {category.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger>
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.value} value={store.value}>
                  {store.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="reviews">Most Reviews</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} found
        </p>
        <p className="text-sm text-muted-foreground">
          Showing {Math.min(sortedProducts.length, 20)} of {sortedProducts.length}
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {sortedProducts.map((product) => (
          <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-2">
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                {product.bestSeller && (
                  <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
                    Best Seller
                  </Badge>
                )}
                {product.fastShipping && (
                  <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                    Fast Shipping
                  </Badge>
                )}
                {!product.inStock && (
                  <Badge variant="destructive" className="absolute top-2 left-2">
                    Out of Stock
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Category and Store */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  <div className="flex items-center gap-1">
                    {React.createElement(getCategoryIcon(product.category), { className: "h-3 w-3" })}
                    {categories.find(c => c.value === product.category)?.label}
                  </div>
                </Badge>
                <Badge variant="outline" className={`text-xs ${getStoreBadgeColor(product.store)}`}>
                  {product.store.charAt(0).toUpperCase() + product.store.slice(1)}
                </Badge>
              </div>

              {/* Product Name */}
              <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {product.description}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(product.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount.toLocaleString()})
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">
                  {product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {product.originalPrice}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <Button 
                onClick={() => handleProductClick(product)}
                className="w-full group-hover:bg-primary group-hover:text-white transition-colors"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on {product.store.charAt(0).toUpperCase() + product.store.slice(1)}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {sortedProducts.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      )}

      {/* Footer Note */}
      <div className="text-center py-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Affiliate Disclosure:</strong> This page contains affiliate links. 
          We may earn a commission when you make a purchase through these links at no additional cost to you.
        </p>
      </div>
      </div>
      

    </div>
  );
}
