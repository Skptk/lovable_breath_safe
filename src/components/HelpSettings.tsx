import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supportLinks } from "@/data/supportLinks";
import { 
  HelpCircle, 
  Mail, 
  BookOpen, 
  GraduationCap, 
  Bug, 
  Lightbulb,
  ExternalLink
} from 'lucide-react';

export default function HelpSettings() {
  const handleEmailClick = () => {
    window.location.href = `mailto:${supportLinks.email}?subject=Breath Safe Support Request`;
  };

  return (
    <div className="space-y-4">
      {/* Contact Support */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Contact Support
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Support</Label>
            <p className="text-sm text-muted-foreground">
              Get help from our support team via email
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleEmailClick}
            >
              <Mail className="h-4 w-4" />
              {supportLinks.email}
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Resources */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Resources
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Frequently Asked Questions</Label>
            <p className="text-sm text-muted-foreground">
              Find answers to common questions
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => window.open(supportLinks.faq, '_blank', 'noopener,noreferrer')}
            >
              <HelpCircle className="h-4 w-4" />
              View FAQ
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Documentation</Label>
            <p className="text-sm text-muted-foreground">
              Read the complete documentation
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => window.open(supportLinks.documentation, '_blank', 'noopener,noreferrer')}
            >
              <BookOpen className="h-4 w-4" />
              View Documentation
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Tutorials & Guides</Label>
            <p className="text-sm text-muted-foreground">
              Learn how to use Breath Safe with step-by-step guides
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => window.open(supportLinks.tutorials, '_blank', 'noopener,noreferrer')}
            >
              <GraduationCap className="h-4 w-4" />
              View Tutorials
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Feedback */}
      <GlassCard variant="default">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Feedback
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Report a Bug</Label>
            <p className="text-sm text-muted-foreground">
              Found a bug? Let us know so we can fix it
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => window.open(supportLinks.bugReport, '_blank', 'noopener,noreferrer')}
            >
              <Bug className="h-4 w-4" />
              Report Bug
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Request a Feature</Label>
            <p className="text-sm text-muted-foreground">
              Have an idea? We'd love to hear it
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => window.open(supportLinks.featureRequest, '_blank', 'noopener,noreferrer')}
            >
              <Lightbulb className="h-4 w-4" />
              Request Feature
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

