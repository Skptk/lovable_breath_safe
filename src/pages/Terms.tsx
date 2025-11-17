import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import Footer from '@/components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      <div className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 xl:p-12 space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 w-full max-w-full overflow-hidden">
        <div className="w-full max-w-full overflow-hidden">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-muted-foreground mt-1 sm:mt-2 lg:mt-3">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:space-y-5 xl:space-y-6">
          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Acceptance of Terms</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>
                By accessing and using Air Quality Tracker, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Description of Service</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>
                Air Quality Tracker provides real-time air quality monitoring, environmental health tracking, and personalized recommendations. Our service includes air quality data collection, analysis, and reporting features.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">User Responsibilities</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>
                Users are responsible for providing accurate information, maintaining the security of their accounts, and using the service in compliance with applicable laws and regulations.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Privacy and Data</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>
                We collect and process personal data in accordance with our Privacy Policy. By using our service, you consent to such processing and warrant that all data provided is accurate.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Limitation of Liability</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>
                Air Quality Tracker is provided "as is" without warranties. We are not liable for any damages arising from the use of our service or reliance on air quality data.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Changes to Terms</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>
                We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Contact Information</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
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