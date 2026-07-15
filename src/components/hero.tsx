import Link from "next/link";
import { Sparkles, Star } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-background via-background to-background pt-20 px-4">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-2 h-2 bg-primary rounded-full opacity-60 animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-secondary rounded-full opacity-40 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-accent rounded-full opacity-50 animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-10 w-1.5 h-1.5 bg-primary rounded-full opacity-30 animate-pulse" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-screen text-center gap-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-sm text-secondary">
          <Sparkles className="w-4 h-4" />
          <span>Unlock Your Cosmic Destiny</span>
        </div>

        {/* Main heading */}
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold text-balance leading-tight">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              AstroKalki
            </span>
            <br />
            <span className="text-foreground">Your Cosmic Guide</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Experience personalized astrology readings, discover celestial insights, and navigate your cosmic journey with precision and wisdom.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-8">
          <Link
            href="/read"
            className="px-8 py-4 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            Get Your Reading
          </Link>
          <Link
            href="/charts"
            className="px-8 py-4 border-2 border-secondary/50 hover:border-secondary text-foreground rounded-lg font-semibold transition-all duration-300 hover:bg-secondary/10"
          >
            Explore Charts
          </Link>
        </div>

        {/* Features preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full max-w-4xl">
          {[
            {
              icon: Star,
              title: "Birth Chart Analysis",
              description: "Comprehensive natal chart calculations",
            },
            {
              icon: Sparkles,
              title: "Daily Horoscopes",
              description: "Personalized daily cosmic guidance",
            },
            {
              icon: Star,
              title: "Compatibility",
              description: "Discover cosmic compatibility scores",
            },
          ].map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-lg bg-card/50 backdrop-blur border border-card-foreground/10 hover:border-primary/30 transition-all duration-300"
              >
                <IconComponent className="w-8 h-8 text-primary mb-3 mx-auto" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
