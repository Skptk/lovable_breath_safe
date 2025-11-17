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
      <section className="relative isolate overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-24 pb-24 lg:pb-28">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <div className="lg:col-span-7 space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 text-primary/90 px-4 py-2 text-xs font-semibold ring-1 ring-primary/30">
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

              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-foreground">
                  Breathe smarter with
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300">
                    intelligent air insights.
                  </span>
                </h1>

                <p className="text-lg sm:text-xl text-muted-foreground/90 max-w-2xl leading-relaxed">
                  Breath Safe makes sense of complex air quality signals, personalizes alerts, and helps you protect your lungs before the environment changes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="px-8 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-900 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:-translate-y-0.5"
                >
                  Start monitoring now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleTryApp}
                  className="px-8 py-3 text-base font-semibold rounded-xl border-primary/30 text-primary/90 bg-primary/10 hover:bg-primary/20 transition-all hover:-translate-y-0.5"
                >
                  Explore live dashboard
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleSignIn}
                  className="px-6 py-3 text-base font-medium text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {heroMetrics.map((metric) => (
                  <GlassCard key={metric.label} className="relative overflow-hidden border-white/10 bg-white/5 px-5 py-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-60" aria-hidden="true" />
                    <div className="relative">
                      <div className="text-sm font-medium text-muted-foreground/80">{metric.label}</div>
                      <div className="text-2xl font-semibold text-foreground mt-1">{metric.value}</div>
                      <div className="text-xs text-muted-foreground mt-2">{metric.hint}</div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <GlassCard className="relative p-6 lg:p-8 bg-white/5 border-white/10 shadow-2xl">
                <div className="absolute inset-0 hero-card-overlay" aria-hidden="true" />
                <div className="relative">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-teal-400/15 flex items-center justify-center">
                        <BotIcon className="h-5 w-5 text-teal-300" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">Breath Safe AI</div>
                        <div className="text-xs text-muted-foreground">Status: Optimizing airflows</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>

                  <div className="mt-4 space-y-4 text-sm">
                    <div className="flex justify-end">
                      <div className="max-w-[70%] rounded-2xl rounded-br-md bg-emerald-400/15 px-4 py-2 text-foreground/90">
                        Help me plan a safe morning run.
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10">
                        <BotIcon className="h-4 w-4 text-teal-200" />
                      </div>
                      <div className="flex-1 rounded-2xl rounded-bl-md bg-white/5 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Generating adaptive plan…
                        </div>
                        <p className="mt-2 text-sm text-foreground/95">
                          Aligning sunrise particulate levels, pollen count, and humidity to tailor a breathable 5K route.
                        </p>
                        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-emerald-400" />
                            Coastal breeze predicted at 6:45am
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-sky-400" />
                            AQI expected to dip to 42
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-fuchsia-400" />
                            Hydration reminders synced to watchOS
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                      <input
                        type="text"
                        placeholder="Ask anything about your air quality plan…"
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-slate-400 focus:outline-none"
                      />
                      <button className="h-9 w-9 rounded-lg bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-900 flex items-center justify-center shadow-md shadow-emerald-500/30">
                        <SendIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-5 -right-5 h-14 w-14 rounded-2xl bg-emerald-400/20 backdrop-blur-sm border border-emerald-200/40 flex items-center justify-center text-emerald-200">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="absolute -bottom-5 -left-4 h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-slate-200">
                  <Code2 className="h-5 w-5" />
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 p-8 md:p-10 bg-white/5 border-white/10">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center md:text-left space-y-2">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">{stat.label}</div>
                <div className="text-3xl font-semibold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground/80">{stat.description}</div>
              </div>
            ))}
          </GlassCard>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="outline" className="mx-auto w-fit border-primary/30 bg-primary/10 text-primary/80 uppercase tracking-[0.4em]">
              Capabilities
            </Badge>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground">
              Designed like a studio-crafted weather system.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Modular intelligence layers combine to visualize risk, forecast change, and recommend the next best action.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                  <div className="relative p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                        {isHovered === feature.heading ? "Active" : "Ready"}
                      </div>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-white">{feature.heading}</h3>
                    <p className="mt-3 text-sm text-white/80 leading-relaxed">
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
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard className="relative overflow-hidden border-white/10 bg-white/5 p-10 sm:p-12 text-center shadow-xl">
            <div className="absolute inset-0 hero-cta-overlay" aria-hidden="true" />
            <div className="relative space-y-6">
              <Badge variant="outline" className="mx-auto w-fit bg-white/10 text-white/80 border-white/30">
                Stay ahead of the air you breathe
              </Badge>
              <h2 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                Ready to breathe better days and sleep through cleaner nights?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Activate holistic monitoring, predictive insights, and tailored routines in under five minutes.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="px-8 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-900 shadow-lg shadow-emerald-500/30"
                >
                  Start your journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSignIn}
                  className="px-8 py-3 text-base font-semibold rounded-xl border-white/30 text-white/80 hover:text-white"
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
