import { useState } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Clock, User, ArrowRight } from "lucide-react";
import { Article, getLatestArticles } from "@/data/articles";
import ArticleModal from "./ArticleModal";
import React from "react";

function NewsCard() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const latestArticles = getLatestArticles(3);

  const getCategoryColor = (category: Article['category']) => {
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div>
        <GlassCard className="relative overflow-hidden h-full min-h-[500px] floating-card transition-opacity duration-150">
          {/* Removed glowing border effect - decorative, causes paint overhead */}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-lg"></div>
          
          <GlassCardHeader className="relative pb-4">
            <div 
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <h3 className="heading-md font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Latest Articles</h3>
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                  Health & Environment
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground/80">
                Updated daily
              </div>
            </div>
          </GlassCardHeader>
          
          <GlassCardContent className="relative pt-0 space-y-4 px-4 lg:px-6">
            {latestArticles.map((article, index) => (
              <div
                key={article.id}
                className={`group cursor-pointer rounded-2xl p-3 sm:p-4 transition-opacity duration-150 border ${
                  index === 0 
                    ? 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30' 
                    : 'bg-gradient-to-br from-muted/20 to-muted/10 border-border/30'
                }`}
                onClick={() => setSelectedArticle(article)}
              >
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Image */}
                  <div className="flex-shrink-0 self-center sm:self-start">
                    <div 
                      className="w-16 h-16 rounded-ds-small overflow-hidden bg-muted/20"
                    >
                      <img 
                        src={article.imageUrl} 
                        alt={article.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getCategoryColor(article.category)} self-center sm:self-start`}
                      >
                        {article.category}
                      </Badge>
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{article.readTime}m</span>
                      </div>
                    </div>
                    
                    <h4 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {article.title}
                    </h4>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {article.summary}
                    </p>
                    
                    <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{article.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(article.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0 self-center">
                    <div
                      className="text-muted-foreground group-hover:text-primary transition-colors duration-150"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </GlassCardContent>
        </GlassCard>
      </div>
      
      {/* Article Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </>
  );
}

export default React.memo(NewsCard);
