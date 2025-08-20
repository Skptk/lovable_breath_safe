import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, ArrowRight, Search, Filter, Calendar, BookOpen } from "lucide-react";
import { Article, getLatestArticles, getAllArticles } from "@/data/articles";
import ArticleModal from "./ArticleModal";
import Header from "@/components/Header";
import React from "react";

interface NewsPageProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function NewsPage({ showMobileMenu, onMobileMenuToggle }: NewsPageProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  
  // Move data fetching to useEffect to prevent render-time side effects
  useEffect(() => {
    const loadArticles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const articles = getAllArticles();
        setAllArticles(articles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load articles');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadArticles();
  }, []);
  
  // Filter and sort articles with null safety
  const filteredArticles = React.useMemo(() => {
    try {
      return allArticles
        .filter(article => {
          // Ensure article exists and has required properties
          if (!article || !article.title || !article.excerpt || !article.category) {
            return false;
          }
          
          const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
          return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
          try {
            switch (sortBy) {
              case "latest":
                return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
              case "oldest":
                return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
              case "title":
                return a.title.localeCompare(b.title);
              default:
                return 0;
            }
          } catch (err) {
            return 0; // Fallback to no sorting if date parsing fails
          }
        });
    } catch (err) {
      console.error('Error filtering articles:', err);
      return [];
    }
  }, [allArticles, searchQuery, selectedCategory, sortBy]);

  const getCategoryColor = (category: Article['category']) => {
    if (!category) {
      return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
    
    switch (category) {
      case 'health':
        return 'bg-error/10 text-error border-error/20';
      case 'environment':
        return 'bg-success/10 text-success border-success/20';
      case 'research':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'tips':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "health", label: "Health" },
    { value: "environment", label: "Environment" },
    { value: "research", label: "Research" },
    { value: "tips", label: "Tips & Advice" }
  ];

  const sortOptions = [
    { value: "latest", label: "Latest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "title", label: "Alphabetical" }
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        title="Health & Environment News"
        subtitle="Stay informed with the latest research, tips, and environmental insights"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center py-12"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading articles...</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center py-12"
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-12 h-12 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold">Failed to Load Articles</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </motion.div>
      )}

      {/* Only show content when not loading and no errors */}
      {!isLoading && !error && (
        <>
          {/* Search and Filter Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-4"
          >
            <Card className="bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm border border-border/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 border-border/30"
                    />
                  </div>

                  {/* Category Filter */}
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-background/50 border-border/30">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort Options */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-background/50 border-border/30">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found</span>
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear search
              </Button>
            )}
          </motion.div>

          {/* Articles Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            {filteredArticles.map((article, index) => {
              // Additional safety check for article properties
              if (!article || !article.id || !article.title || !article.imageUrl) {
                return null; // Skip rendering invalid articles
              }
              
              return (
                <motion.div
                  key={article.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedArticle(article)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 0.3 + index * 0.1, 
                    duration: 0.5,
                    ease: "easeOut"
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                >
                  <Card className="relative overflow-hidden h-full bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/20 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:border-primary/30">
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-lg"></div>
                    
                    {/* Article Image */}
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      <img 
                        src={article.imageUrl} 
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      
                      {/* Category Badge */}
                      <div className="absolute top-4 left-4">
                        <Badge className={`${getCategoryColor(article.category)} backdrop-blur-sm`}>
                          {article.category}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="relative p-6 space-y-4">
                      {/* Article Meta */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(article.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{article.author}</span>
                        </div>
                      </div>

                      {/* Article Title */}
                      <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
                        {article.title}
                      </h3>

                      {/* Article Excerpt */}
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {article.excerpt}
                      </p>

                      {/* Read More Button */}
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80 hover:bg-primary/10 transition-all duration-200"
                        >
                          Read More
                          <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                        </Button>
                        
                        <div className="text-xs text-muted-foreground">
                          {article.readTime} min read
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* No Results Message */}
          {filteredArticles.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center py-12"
            >
              <div className="max-w-md mx-auto space-y-4">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                <h3 className="text-lg font-semibold text-foreground">No articles found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            </motion.div>
          )}

          {/* Article Modal */}
          {selectedArticle && (
            <ArticleModal
              article={selectedArticle}
              onClose={() => setSelectedArticle(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
