import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { appInfo } from "@/data/appInfo";
import { Info, ExternalLink, Code, Calendar, FileText, Award } from 'lucide-react';
import { format } from 'date-fns';

export default function AboutSettings() {
  return (
    <div className="space-y-4">
      {/* App Version */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Application Information
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Code className="h-4 w-4 text-muted-foreground" />
              Version
            </Label>
            <p className="text-sm font-medium">{appInfo.version}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Build Date
            </Label>
            <p className="text-sm font-medium">
              {format(new Date(appInfo.buildDate), 'MMMM d, yyyy')}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              License
            </Label>
            <p className="text-sm font-medium">{appInfo.license}</p>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Credits */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Credits & Acknowledgments
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Breath Safe is built with the help of these amazing open-source projects and services:
          </p>
          <div className="space-y-2">
            {appInfo.credits.map((credit, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                <div className="flex-1">
                  <p className="text-sm font-medium">{credit.name}</p>
                  {credit.description && (
                    <p className="text-xs text-muted-foreground">{credit.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(credit.url, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-3 w-3" />
                  Visit
                </Button>
              </div>
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Changelog */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Changelog
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            View the complete changelog to see what's new and what's changed.
          </p>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => window.open(appInfo.changelogUrl, '_blank', 'noopener,noreferrer')}
          >
            <FileText className="h-4 w-4" />
            View Changelog
          </Button>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

