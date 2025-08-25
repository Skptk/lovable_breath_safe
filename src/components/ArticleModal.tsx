import { useState, useEffect } from "react";
import { X, Clock, User, Calendar } from "lucide-react";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Article } from "@/data/articles";

interface ArticleModalProps {
  article: Article;
  onClose: () => void;
}

export default function ArticleModal({ article, onClose }: ArticleModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Early return if no article (after hooks)
  if (!article) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

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

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <GlassCard 
          className={`w-full max-w-4xl max-h-[90vh] overflow-hidden glass-card transform transition-all duration-300 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Header with image */}
            <div className="relative h-48 bg-gradient-to-r from-primary/20 to-accent/20">
              {article.imageUrl && (
                <img 
                  src={article.imageUrl} 
                  alt={article.title || 'Article'}
                  loading="lazy"
                  className="w-full h-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-6 right-16 text-white">
                <Badge variant="outline" className={`mb-2 ${getCategoryColor(article.category)}`}>
                  {article.category ? article.category.charAt(0).toUpperCase() + article.category.slice(1) : 'Unknown'}
                </Badge>
                <h1 className="text-2xl font-bold">{article.title || 'Untitled Article'}</h1>
              </div>
            </div>
            
            {/* Article meta */}
            <div className="px-6 py-4 border-b border-border/20">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{article.author || 'Unknown Author'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{article.publishedAt ? formatDate(article.publishedAt) : 'No date'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{article.readTime ? `${article.readTime} min read` : 'Unknown read time'}</span>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <GlassCardContent className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                {article.summary && (
                  <p className="text-lg text-muted-foreground mb-6 font-medium">
                    {article.summary}
                  </p>
                )}
                {article.content && (
                  <div 
                    className="article-content"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                )}
                {!article.content && !article.summary && (
                  <p className="text-muted-foreground">No content available for this article.</p>
                )}
              </div>
            </GlassCardContent>
          </div>
        </GlassCard>
      </div>
    </>
  );
}
