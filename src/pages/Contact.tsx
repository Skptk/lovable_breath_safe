import { motion } from "framer-motion";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

export default function Contact(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border backdrop-blur-sm w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-4 sm:py-5 md:py-6 lg:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="h-8 sm:h-9 lg:h-10 text-xs sm:text-sm lg:text-base">
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-1.5 sm:mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground">Contact Information</h1>
              <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-muted-foreground mt-1">Get in touch with the Breath Safe team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-8 sm:py-10 md:py-12 lg:py-16 w-full max-w-full overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7 md:gap-8 lg:gap-10 xl:gap-12">
          {/* Contact Information */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-3 sm:mb-4 lg:mb-5">Get in Touch</h2>
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground mb-4 sm:mb-5 lg:mb-6">
                Have questions about air quality monitoring or need support with your Breath Safe account? 
                We're here to help you breathe easier.
              </p>
            </motion.div>

            <motion.div
              className="space-y-3 sm:space-y-4 lg:space-y-5"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
              <GlassCard className="floating-card w-full max-w-full overflow-hidden">
                <GlassCardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg xl:text-xl text-foreground">Email Support</h3>
                      <p className="text-xs sm:text-sm lg:text-base text-muted-foreground break-all">support@breathsafe.com</p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              <GlassCard className="floating-card w-full max-w-full overflow-hidden">
                <GlassCardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg xl:text-xl text-foreground">Phone Support</h3>
                      <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">+1 (555) 123-4567</p>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              <GlassCard className="floating-card w-full max-w-full overflow-hidden">
                <GlassCardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg xl:text-xl text-foreground">Support Hours</h3>
                      <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Monday - Friday: 9 AM - 6 PM EST</p>
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
            className="w-full max-w-full overflow-hidden"
          >
            <GlassCard className="floating-card w-full max-w-full overflow-hidden">
              <GlassCardHeader className="px-4 sm:px-5 lg:px-6 pt-6 sm:pt-8">
                <GlassCardTitle className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold">Send us a Message</GlassCardTitle>
                <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-muted-foreground mt-1 sm:mt-2">
                  Fill out the form below and we'll get back to you within 24 hours.
                </p>
              </GlassCardHeader>
              <GlassCardContent className="space-y-3 sm:space-y-4 lg:space-y-5 px-4 sm:px-5 lg:px-6 pb-6 sm:pb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm lg:text-base font-medium text-foreground mb-1.5 sm:mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 sm:py-2.5 lg:py-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm lg:text-base font-medium text-foreground mb-1.5 sm:mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 sm:py-2.5 lg:py-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm lg:text-base font-medium text-foreground mb-1.5 sm:mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 sm:py-2.5 lg:py-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm lg:text-base font-medium text-foreground mb-1.5 sm:mb-2">
                    Subject
                  </label>
                  <select className="w-full px-3 py-2 sm:py-2.5 lg:py-3 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent h-9 sm:h-10 lg:h-11 text-sm sm:text-base lg:text-lg">
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm lg:text-base font-medium text-foreground mb-1.5 sm:mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 sm:py-2.5 lg:py-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm sm:text-base lg:text-lg"
                    placeholder="Tell us how we can help you..."
                  ></textarea>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 h-9 sm:h-10 lg:h-11 xl:h-12 text-sm sm:text-base lg:text-lg font-semibold">
                  Send Message
                </Button>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </div>

        {/* Additional Information */}
        <motion.div
          className="mt-8 sm:mt-10 lg:mt-12 xl:mt-16 w-full max-w-full overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        >
          <GlassCard className="floating-card w-full max-w-full overflow-hidden">
            <GlassCardContent className="p-4 sm:p-5 md:p-6 lg:p-8">
              <h3 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-foreground mb-3 sm:mb-4 lg:mb-5">Frequently Asked Questions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 text-xs sm:text-sm lg:text-base text-muted-foreground">
                <div className="space-y-1.5 sm:space-y-2">
                  <p><strong className="text-foreground">How accurate is the air quality data?</strong></p>
                  <p>Our data comes from multiple reliable sources including OpenWeatherMap and government monitoring stations.</p>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <p><strong className="text-foreground">Can I use the app without location access?</strong></p>
                  <p>Yes, but with limited functionality. Location access provides the most accurate local data.</p>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <p><strong className="text-foreground">How often is the data updated?</strong></p>
                  <p>Air quality data is refreshed every 15 minutes for real-time accuracy.</p>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <p><strong className="text-foreground">Is my data private?</strong></p>
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
