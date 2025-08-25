import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import Footer from '@/components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-4">
          <GlassCard className="floating-card shadow-card border-0">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg">Acceptance of Terms</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-sm text-muted-foreground">
              <p>
                By accessing and using Air Quality Tracker, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg">Description of Service</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-sm text-muted-foreground">
              <p>
                Air Quality Tracker provides real-time air quality monitoring, environmental health tracking, and personalized recommendations. Our service includes air quality data collection, analysis, and reporting features.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg">User Responsibilities</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-sm text-muted-foreground">
              <p>
                Users are responsible for providing accurate information, maintaining the security of their accounts, and using the service in compliance with applicable laws and regulations.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg">Privacy and Data</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-sm text-muted-foreground">
              <p>
                We collect and process personal data in accordance with our Privacy Policy. By using our service, you consent to such processing and warrant that all data provided is accurate.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg">Limitation of Liability</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-sm text-muted-foreground">
              <p>
                Air Quality Tracker is provided "as is" without warranties. We are not liable for any damages arising from the use of our service or reliance on air quality data.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg">Changes to Terms</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-sm text-muted-foreground">
              <p>
                We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg">Contact Information</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-sm text-muted-foreground">
              <p>
                If you have any questions about these Terms of Service, please contact us at terms@airqualitytracker.com
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}