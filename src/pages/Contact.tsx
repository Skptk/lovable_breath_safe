import { motion } from "framer-motion";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

export default function Contact(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30">
      {/* Header */}
      <div className="bg-card border-b border-border backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Contact Information</h1>
              <p className="text-muted-foreground">Get in touch with the Breath Safe team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">Get in Touch</h2>
              <p className="text-muted-foreground mb-6">
                Have questions about air quality monitoring or need support with your Breath Safe account? 
                We're here to help you breathe easier.
              </p>
            </motion.div>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
              <GlassCard className="floating-card">
                <GlassCardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Email Support</h3>
                      <p className="text-sm text-muted-foreground">support@breathsafe.com</p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              <GlassCard className="floating-card">
                <GlassCardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Phone Support</h3>
                      <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              <GlassCard className="floating-card">
                <GlassCardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Support Hours</h3>
                      <p className="text-sm text-muted-foreground">Monday - Friday: 9 AM - 6 PM EST</p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <GlassCard className="floating-card">
              <GlassCardHeader>
                <GlassCardTitle className="text-xl font-semibold">Send us a Message</GlassCardTitle>
                <p className="text-sm text-muted-foreground">
                  Fill out the form below and we'll get back to you within 24 hours.
                </p>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Subject
                  </label>
                  <select className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder="Tell us how we can help you..."
                  ></textarea>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90">
                  Send Message
                </Button>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </div>

        {/* Additional Information */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        >
          <GlassCard className="floating-card">
            <GlassCardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Frequently Asked Questions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <p><strong>How accurate is the air quality data?</strong></p>
                  <p>Our data comes from multiple reliable sources including OpenWeatherMap and government monitoring stations.</p>
                </div>
                <div>
                  <p><strong>Can I use the app without location access?</strong></p>
                  <p>Yes, but with limited functionality. Location access provides the most accurate local data.</p>
                </div>
                <div>
                  <p><strong>How often is the data updated?</strong></p>
                  <p>Air quality data is refreshed every 15 minutes for real-time accuracy.</p>
                </div>
                <div>
                  <p><strong>Is my data private?</strong></p>
                  <p>Absolutely. We never share your personal data or location information with third parties.</p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </motion.div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
