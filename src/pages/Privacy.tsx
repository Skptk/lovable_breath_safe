import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import Footer from '@/components/Footer';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      <div className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 xl:p-12 space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 w-full max-w-full overflow-hidden">
        <div className="w-full max-w-full overflow-hidden">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-muted-foreground mt-1 sm:mt-2 lg:mt-3">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:space-y-5 xl:space-y-6">
          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Information We Collect</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3 sm:space-y-4 lg:space-y-5 text-xs sm:text-sm lg:text-base px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <div>
                <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-1.5 sm:mb-2 lg:mb-3">Personal Information</h4>
                <p className="text-muted-foreground">
                  We collect information you provide directly, including your email address, name, and account preferences when you create an account.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-1.5 sm:mb-2 lg:mb-3">Location Data</h4>
                <p className="text-muted-foreground">
                  With your permission, we collect your device's location to provide accurate air quality information for your area. Location data is only used to fetch relevant air quality data and is not shared with third parties.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-1.5 sm:mb-2 lg:mb-3">Usage Data</h4>
                <p className="text-muted-foreground">
                  We automatically collect information about how you use our app, including air quality readings, points earned, and feature usage to improve our services.
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">How We Use Your Information</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2 sm:space-y-3 lg:space-y-4 text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>• Provide personalized air quality information for your location</p>
              <p>• Track your points and historical air quality exposure</p>
              <p>• Send you relevant product recommendations</p>
              <p>• Improve our services and develop new features</p>
              <p>• Communicate with you about your account and our services</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Information Sharing</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3 sm:space-y-4 lg:space-y-5 text-xs sm:text-sm lg:text-base px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <div>
                <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-1.5 sm:mb-2 lg:mb-3">Third-Party Services</h4>
                <p className="text-muted-foreground">
                  We use OpenWeatherMap API to fetch air quality data. Your location coordinates are shared with this service to provide accurate readings.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-1.5 sm:mb-2 lg:mb-3">Affiliate Partners</h4>
                <p className="text-muted-foreground">
                  When you click on product links, you may be redirected to affiliate partners (Amazon, AliExpress, local retailers). We do not share your personal information with these partners.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base lg:text-lg mb-1.5 sm:mb-2 lg:mb-3">Legal Requirements</h4>
                <p className="text-muted-foreground">
                  We may disclose your information if required by law or to protect our rights, safety, or the rights and safety of others.
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Data Security</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is stored using industry-standard encryption and security practices through Supabase.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Your Rights</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2 sm:space-y-3 lg:space-y-4 text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>• Access and review your personal information</p>
              <p>• Request correction of inaccurate data</p>
              <p>• Request deletion of your data</p>
              <p>• Opt out of marketing communications</p>
              <p>• Export your data in a portable format</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card shadow-card border-0 w-full max-w-full overflow-hidden">
            <GlassCardHeader className="px-4 sm:px-5 md:px-6 lg:px-8 pt-6 sm:pt-8">
              <GlassCardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl">Contact Us</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="text-xs sm:text-sm lg:text-base text-muted-foreground px-4 sm:px-5 md:px-6 lg:px-8 pb-6 sm:pb-8">
              <p>
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="mt-2 sm:mt-3">
                <strong>Email:</strong> privacy@breathsafe.com<br />
                <strong>Address:</strong> [Your Company Address]<br />
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
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