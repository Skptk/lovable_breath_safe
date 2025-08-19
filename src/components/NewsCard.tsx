import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, ArrowRight } from "lucide-react";
import { Article, getLatestArticles } from "@/data/articles";
import ArticleModal from "./ArticleModal";

export default function NewsCard() {
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
      <Card className="relative overflow-hidden h-full min-h-[500px] bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/20 shadow-xl hover:shadow-2xl transition-all duration-300">
        {/* Glowing border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-lg"></div>
        
        <CardHeader className="relative pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="heading-md font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Latest Articles</h3>
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 backdrop-blur-sm">
                Health & Environment
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground/80">
              Updated daily
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative pt-0 space-y-4 px-4 lg:px-6">
          {latestArticles.map((article, index) => (
            <div
              key={article.id}
              className={`group cursor-pointer rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border ${
                index === 0 
                  ? 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 backdrop-blur-md' 
                  : 'bg-gradient-to-br from-muted/20 to-muted/10 border-border/30 backdrop-blur-sm'
              }`}
              onClick={() => setSelectedArticle(article)}
            >
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Image */}
                <div className="flex-shrink-0 self-center sm:self-start">
                  <div className="w-16 h-16 rounded-ds-small overflow-hidden bg-muted/20">
                    <img 
                      src={article.imageUrl} 
                      alt={article.title}
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
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{article.author}</span>
                      <span>•</span>
                      <span>{formatDate(article.publishDate)}</span>
                    </div>
                    
                    <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 self-center sm:self-end" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* View More Button */}
          <div className="pt-2">
            <div className="text-center">
              <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                View All Articles →
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      
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
