import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Footer from '@/components/Footer';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-4">
          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Personal Information</h4>
                <p className="text-muted-foreground">
                  We collect information you provide directly, including your email address, name, and account preferences when you create an account.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Location Data</h4>
                <p className="text-muted-foreground">
                  With your permission, we collect your device's location to provide accurate air quality information for your area. Location data is only used to fetch relevant air quality data and is not shared with third parties.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Data</h4>
                <p className="text-muted-foreground">
                  We automatically collect information about how you use our app, including air quality readings, points earned, and feature usage to improve our services.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Provide personalized air quality information for your location</p>
              <p>• Track your points and historical air quality exposure</p>
              <p>• Send you relevant product recommendations</p>
              <p>• Improve our services and develop new features</p>
              <p>• Communicate with you about your account and our services</p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Information Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Third-Party Services</h4>
                <p className="text-muted-foreground">
                  We use OpenWeatherMap API to fetch air quality data. Your location coordinates are shared with this service to provide accurate readings.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Affiliate Partners</h4>
                <p className="text-muted-foreground">
                  When you click on product links, you may be redirected to affiliate partners (Amazon, AliExpress, local retailers). We do not share your personal information with these partners.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Legal Requirements</h4>
                <p className="text-muted-foreground">
                  We may disclose your information if required by law or to protect our rights, safety, or the rights and safety of others.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Data Security</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is stored using industry-standard encryption and security practices through Supabase.
              </p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Access and review your personal information</p>
              <p>• Request correction of inaccurate data</p>
              <p>• Request deletion of your data</p>
              <p>• Opt out of marketing communications</p>
              <p>• Export your data in a portable format</p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="mt-2">
                <strong>Email:</strong> privacy@breathsafe.com<br />
                <strong>Address:</strong> [Your Company Address]<br />
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}