import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg';
  opacity?: 'light' | 'medium' | 'heavy';
  variant?: 'default' | 'elevated' | 'subtle';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className,
  blur = 'md',
  opacity = 'medium',
  variant = 'default',
  ...props
}) => {
  const blurClasses = {
    sm: '', // Removed backdrop-blur for performance
    md: '', // Removed backdrop-blur for performance
    lg: '' // Removed backdrop-blur for performance
  };

  const opacityClasses = {
    light: 'bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10',
    medium: 'bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10 md:dark:bg-white/5',
    heavy: 'bg-white/20 dark:bg-white/10 border-white/30 dark:border-white/15 md:dark:bg-white/10'
  };

  const variantClasses = {
    default: 'shadow-lg shadow-black/10 dark:shadow-black/30',
    elevated: 'shadow-xl shadow-black/15 dark:shadow-black/40',
    subtle: 'shadow-md shadow-black/5 dark:shadow-black/20'
  };

  return (
    <div
      {...props}
      className={cn(
      'rounded-xl border transition-opacity duration-150 ease-out transition-transform duration-150 ease-out',
      blurClasses[blur],
      opacityClasses[opacity],
      variantClasses[variant],
      'hover:transform hover:translate-y-[-1px] hover:shadow-lg',
      'dark:hover:shadow-black/30',
      className
    )}
      style={{ 
        contain: 'layout paint',
        ...props.style 
      }}
    >
      {children}
    </div>
  );
};

// Export individual parts for flexible usage
export const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4", className)}
    {...props}
  />
));
GlassCardHeader.displayName = "GlassCardHeader";

export const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
GlassCardTitle.displayName = "GlassCardTitle";

export const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
GlassCardDescription.displayName = "GlassCardDescription";

export const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent";

export const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
));
GlassCardFooter.displayName = "GlassCardFooter";
