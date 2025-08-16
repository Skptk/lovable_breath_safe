import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Activity, 
  ShoppingCart, 
  Settings, 
  MapPin, 
  Heart, 
  TrendingUp,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (route: string) => void;
}

export default function SearchDialog({ open, onOpenChange, onNavigate }: SearchDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    searchQuery, 
    setSearchQuery, 
    searchResults, 
    popularSearches,
    hasResults 
  } = useGlobalSearch();

  const getCategoryIcon = (category: SearchResult['category']) => {
    switch (category) {
      case 'aqi':
      case 'pollutant':
        return <Activity className="h-4 w-4" />;
      case 'app':
        return <Settings className="h-4 w-4" />;
      case 'shop':
        return <ShoppingCart className="h-4 w-4" />;
      case 'health':
        return <Heart className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: SearchResult['category']) => {
    switch (category) {
      case 'aqi':
      case 'pollutant':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'app':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'shop':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'health':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.action) {
      case 'navigate':
        if (result.data?.route && onNavigate) {
          onNavigate(result.data.route);
          onOpenChange(false);
        }
        break;
      case 'view_product':
        if (result.data?.product) {
          // Navigate to store and potentially highlight the product
          if (onNavigate) {
            onNavigate('store');
            onOpenChange(false);
            toast({
              title: "Product Found",
              description: `Showing ${result.title} in store`,
            });
          }
        }
        break;
      case 'enable_location':
        toast({
          title: "Location Services",
          description: "Please enable location access in your browser settings to get accurate air quality data.",
        });
        onOpenChange(false);
        break;
      case 'learn_more':
        toast({
          title: result.title,
          description: result.description,
        });
        onOpenChange(false);
        break;
      default:
        toast({
          title: result.title,
          description: result.description,
        });
        onOpenChange(false);
    }
  };

  const handlePopularSearchClick = (search: string) => {
    setSearchQuery(search);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Breath Safe
          </DialogTitle>
        </DialogHeader>

        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for AQI info, app features, health tips, or products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-base"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-96 px-6 pb-6">
          {/* Search Results */}
          {hasResults && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  <div className="mt-0.5">
                    {getCategoryIcon(result.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">{result.title}</h4>
                      <Badge variant="outline" className={`ml-2 text-xs ${getCategoryColor(result.category)}`}>
                        {result.category.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {!hasResults && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Popular Searches
              </h3>
              <div className="space-y-2">
                {popularSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => handlePopularSearchClick(search)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left w-full group"
                  >
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{search}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchQuery && !hasResults && (
            <div className="mt-8 text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try searching for AQI levels, air purifiers, or app features
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-6 py-4 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Search through AQI data, app features, health tips, and store products
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
