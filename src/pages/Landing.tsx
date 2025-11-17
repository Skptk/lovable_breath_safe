import { useState, useEffect, lazy, Suspense, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  TrendingUp,
  MapPin,
  Award,
  Users,
  Zap,
  ArrowRight,
  Bot as BotIcon,
  Send as SendIcon,
  Code2
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Footer from "@/components/Footer";
// Development tools - only imported in development
const DevToolsComponent: ComponentType = import.meta.env.DEV
  ? lazy(() =>
      import("@/components/dev/DevToolsWrapper").then((module) => ({
        default: module.DevToolsWrapper,
      }))
    )
  : () => null;


const heroMetrics = [
  { label: "AI Assistant", value: "Hewa+", hint: "Built by Breath Safe" },
  { label: "Realtime Uptime", value: "99.9%", hint: "Fully monitored" },
  { label: "Avg. Response", value: "120ms", hint: "Lightning fast" }
];

const featureCards = [
  {
    icon: Shield,
    heading: "Smart Exposure Shield",
    description: "Adaptive alerts that anticipate exposure spikes using live AQI and weather patterns.",
    accent: "from-emerald-400/40 to-teal-500/30",
    glow: "shadow-[0_0_60px_-15px_rgba(45,212,191,0.55)]"
  },
  {
    icon: TrendingUp,
    heading: "Predictive Wellness",
    description: "Understand long-term impact with trend analysis and intelligent health scoring.",
    accent: "from-sky-400/40 to-blue-500/25",
    glow: "shadow-[0_0_60px_-15px_rgba(56,189,248,0.55)]"
  },
  {
    icon: MapPin,
    heading: "Location Intelligence",
    description: "Discover cleaner routes and microclimates tailored to your routines and commutes.",
    accent: "from-purple-400/40 to-fuchsia-500/25",
    glow: "shadow-[0_0_60px_-15px_rgba(168,85,247,0.55)]"
  },
  {
    icon: Award,
    heading: "Achievement Engine",
    description: "Earn badges and rewards for healthier choices and sustained improvement streaks.",
    accent: "from-amber-400/45 to-orange-500/20",
    glow: "shadow-[0_0_55px_-18px_rgba(251,191,36,0.55)]"
  },
  {
    icon: Users,
    heading: "Community Signals",
    description: "Tap into global Breath Safe data to benchmark community progress and best practices.",
    accent: "from-pink-400/45 to-rose-500/20",
    glow: "shadow-[0_0_55px_-18px_rgba(244,114,182,0.55)]"
  },
  {
    icon: Zap,
    heading: "Instant Insights",
    description: "Surface what matters with contextual summaries, micro-actions, and fast follow suggestions.",
    accent: "from-lime-400/40 to-teal-400/30",
    glow: "shadow-[0_0_55px_-20px_rgba(190,242,100,0.45)]"
  }
];

export default function Landing(): JSX.Element {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const [isHovered, setIsHovered] = useState<string | null>(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard?view=dashboard");
    }
  }, [user, loading, navigate]);

  const stats = [
    { label: "Active Users", value: "Onboarding", description: "Trusting Breath Safe" },
    { label: "Cities Covered", value: "500+", description: "Worldwide coverage" },
    { label: "Data Source", value: "OpenWeatherMap", description: "Real-time readings" },
    { label: "Health Score", value: "Pending", description: "User satisfaction" }
  ];

  const handleGetStarted = () => {
    navigate("/onboarding");
  };

  const handleSignIn = () => {
    navigate("/auth");
  };

  const handleTryApp = () => {
    navigate("/demo?view=dashboard");
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col ${theme}`}>
        {/* Development Tools - Only in development */}
        {import.meta.env.DEV && (
          <Suspense fallback={null}>
            <DevToolsComponent />
          </Suspense>
        )}

        {/* Main content */}
        <main className="flex-1">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="absolute inset-0 -z-20 aura-gradient" aria-hidden="true" />
      <div className="absolute -top-32 -left-16 -z-10 aura-orb aura-orb--teal" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 -z-10 aura-orb aura-orb--violet" aria-hidden="true" />

      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <DevToolsComponent />
        </Suspense>
      )}

      {/* Hero Section */}
      <section className="relative isolate overflow-hidden w-full max-w-full overflow-x-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 pt-16 sm:pt-20 md:pt-24 pb-16 sm:pb-20 md:pb-24 lg:pb-28 xl:pb-32">
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 md:gap-12 lg:gap-16 xl:gap-20 items-center">
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 md:space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 text-primary/90 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs lg:text-sm font-semibold ring-1 ring-primary/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3v2" strokeLinecap="round" />
                  <path d="m16.24 7.76 1.42 1.42" strokeLinecap="round" />
                  <path d="M21 12h-2" strokeLinecap="round" />
                  <path d="m16.24 16.24 1.42-1.42" strokeLinecap="round" />
                  <path d="M12 21v-2" strokeLinecap="round" />
                  <path d="m6.34 16.34-1.42 1.42" strokeLinecap="round" />
                  <path d="M5 12H3" strokeLinecap="round" />
                  <path d="m6.34 7.66-1.42-1.42" strokeLinecap="round" />
                </svg>
                Real-time breathing assistant
              </span>

              <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight text-foreground">
                  Breathe smarter with
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300">
                    intelligent air insights.
                  </span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground/90 max-w-2xl leading-relaxed">
                  Breath Safe makes sense of complex air quality signals, personalizes alerts, and helps you protect your lungs before the environment changes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-5">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg font-semibold rounded-xl bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-900 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:-translate-y-0.5"
                >
                  Start monitoring now
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleTryApp}
                  className="w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg font-semibold rounded-xl border-primary/30 text-primary/90 bg-primary/10 hover:bg-primary/20 transition-all hover:-translate-y-0.5"
                >
                  Explore live dashboard
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleSignIn}
                  className="w-full sm:w-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg font-medium text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
                {heroMetrics.map((metric) => (
                  <GlassCard key={metric.label} className="relative overflow-hidden border-white/10 bg-white/5 px-4 sm:px-5 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-5">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-60" aria-hidden="true" />
                    <div className="relative">
                      <div className="text-xs sm:text-sm lg:text-base font-medium text-muted-foreground/80">{metric.label}</div>
                      <div className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold text-foreground mt-1 lg:mt-2">{metric.value}</div>
                      <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground mt-1 sm:mt-2">{metric.hint}</div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 mt-8 lg:mt-0">
              <GlassCard className="relative p-4 sm:p-6 lg:p-8 xl:p-10 bg-white/5 border-white/10 shadow-2xl w-full max-w-full overflow-hidden">
                <div className="absolute inset-0 hero-card-overlay" aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-teal-400/15 flex items-center justify-center flex-shrink-0">
                        <BotIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-teal-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm lg:text-base font-semibold text-foreground truncate">Breath Safe AI</div>
                        <div className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground truncate">Status: Optimizing airflows</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs lg:text-sm text-emerald-300 flex-shrink-0 ml-2">
                      <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>

                  <div className="mt-3 sm:mt-4 lg:mt-6 space-y-3 sm:space-y-4 text-xs sm:text-sm lg:text-base">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-2xl rounded-br-md bg-emerald-400/15 px-3 sm:px-4 lg:px-5 py-2 lg:py-2.5 text-foreground/90 text-xs sm:text-sm lg:text-base">
                        Help me plan a safe morning run.
                      </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-full bg-white/10 flex-shrink-0">
                        <BotIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-teal-200" />
                      </div>
                      <div className="flex-1 min-w-0 rounded-2xl rounded-bl-md bg-white/5 px-3 sm:px-4 lg:px-5 py-2 sm:py-3">
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                          <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Generating adaptive plan…
                        </div>
                        <p className="mt-1.5 sm:mt-2 lg:mt-3 text-xs sm:text-sm lg:text-base text-foreground/95">
                          Aligning sunrise particulate levels, pollen count, and humidity to tailor a breathable 5K route.
                        </p>
                        <div className="mt-2 sm:mt-3 lg:mt-4 space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="h-1 w-1 rounded-full bg-emerald-400 flex-shrink-0" />
                            <span className="truncate">Coastal breeze predicted at 6:45am</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="h-1 w-1 rounded-full bg-sky-400 flex-shrink-0" />
                            <span className="truncate">AQI expected to dip to 42</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="h-1 w-1 rounded-full bg-fuchsia-400 flex-shrink-0" />
                            <span className="truncate">Hydration reminders synced to watchOS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-5 lg:mt-6 border-t border-white/10 pt-3 sm:pt-4">
                    <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3">
                      <input
                        type="text"
                        placeholder="Ask anything about your air quality plan…"
                        className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm lg:text-base text-foreground placeholder:text-slate-400 focus:outline-none"
                      />
                      <button className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-lg bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-900 flex items-center justify-center shadow-md shadow-emerald-500/30 flex-shrink-0">
                        <SendIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-3 -right-3 sm:-top-5 sm:-right-5 h-10 w-10 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-2xl bg-emerald-400/20 backdrop-blur-sm border border-emerald-200/40 flex items-center justify-center text-emerald-200">
                  <Zap className="h-4 w-4 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                </div>
                <div className="absolute -bottom-3 -left-3 sm:-bottom-5 sm:-left-4 h-9 w-9 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-slate-200">
                  <Code2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 w-full max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12">
          <GlassCard className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-6 lg:gap-8 p-6 sm:p-8 md:p-10 lg:p-12 bg-white/5 border-white/10 w-full max-w-full overflow-hidden">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center md:text-left space-y-1.5 sm:space-y-2 lg:space-y-3">
                <div className="text-[10px] sm:text-xs lg:text-sm uppercase tracking-[0.3em] text-muted-foreground/70">{stat.label}</div>
                <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs sm:text-sm lg:text-base text-muted-foreground/80">{stat.description}</div>
              </div>
            ))}
          </GlassCard>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16 space-y-3 sm:space-y-4 lg:space-y-6">
            <Badge variant="outline" className="mx-auto w-fit border-primary/30 bg-primary/10 text-primary/80 uppercase tracking-[0.4em] text-[10px] sm:text-xs lg:text-sm px-3 sm:px-4 py-1 sm:py-1.5">
              Capabilities
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold text-foreground px-2">
              Designed like a studio-crafted weather system.
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-2">
              Modular intelligence layers combine to visualize risk, forecast change, and recommend the next best action.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              const key = feature.heading;
              return (
                <GlassCard
                  key={key}
                  className={`group relative overflow-hidden border-white/10 bg-gradient-to-br ${feature.accent} ${feature.glow} transition-all hover:-translate-y-1.5 hover:border-white/20`}
                  onMouseEnter={() => setIsHovered(feature.heading)}
                  onMouseLeave={() => setIsHovered(null)}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_55%)]" />
                  <div className="relative p-5 sm:p-6 lg:p-8 xl:p-10">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-xl bg-white/10 text-white">
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                      </div>
                      <div className="text-[10px] sm:text-xs lg:text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
                        {isHovered === feature.heading ? "Active" : "Ready"}
                      </div>
                    </div>
                    <h3 className="mt-4 sm:mt-5 lg:mt-6 text-lg sm:text-xl lg:text-2xl xl:text-3xl font-semibold text-white">{feature.heading}</h3>
                    <p className="mt-2 sm:mt-3 lg:mt-4 text-xs sm:text-sm lg:text-base xl:text-lg text-white/80 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 xl:py-24 w-full max-w-full overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12">
          <GlassCard className="relative overflow-hidden border-white/10 bg-white/5 p-6 sm:p-8 md:p-10 lg:p-12 xl:p-16 text-center shadow-xl w-full max-w-full">
            <div className="absolute inset-0 hero-cta-overlay" aria-hidden="true" />
            <div className="relative space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-8">
              <Badge variant="outline" className="mx-auto w-fit bg-white/10 text-white/80 border-white/30 text-[10px] sm:text-xs lg:text-sm px-3 sm:px-4 py-1 sm:py-1.5">
                Stay ahead of the air you breathe
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold text-foreground leading-tight px-2">
                Ready to breathe better days and sleep through cleaner nights?
              </h2>
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
                Activate holistic monitoring, predictive insights, and tailored routines in under five minutes.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 lg:gap-5">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg font-semibold rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-900 shadow-lg shadow-emerald-500/30"
                >
                  Start your journey
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSignIn}
                  className="w-full sm:w-auto px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg font-semibold rounded-xl border-white/30 text-white/80 hover:text-white"
                >
                  I already have an account
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
