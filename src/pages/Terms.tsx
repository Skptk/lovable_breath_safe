import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                By accessing and using Air Quality Tracker, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Description of Service</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Air Quality Tracker provides real-time air quality monitoring, environmental health tracking, and personalized recommendations. Our service includes air quality data collection, analysis, and reporting features.
              </p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Users are responsible for providing accurate information, maintaining the security of their accounts, and using the service in compliance with applicable laws and regulations.
              </p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Privacy and Data</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                We collect and process personal data in accordance with our Privacy Policy. By using our service, you consent to such processing and warrant that all data provided is accurate.
              </p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Air Quality Tracker is provided "as is" without warranties. We are not liable for any damages arising from the use of our service or reliance on air quality data.
              </p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </CardContent>
          </Card>

          <Card className="floating-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                If you have any questions about these Terms of Service, please contact us at terms@airqualitytracker.com
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