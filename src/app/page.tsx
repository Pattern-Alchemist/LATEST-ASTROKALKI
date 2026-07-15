import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Footer } from "@/components/footer";
import { Sparkles, Calendar, Users, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <Hero />

        {/* Features Section */}
        <section className="w-full py-20 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Why Choose <span className="text-primary">AstroKalki?</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We combine ancient wisdom with modern technology to provide
                accurate and insightful cosmic guidance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Sparkles,
                  title: "Accurate Calculations",
                  description: "Precise planetary positions and aspects",
                },
                {
                  icon: Calendar,
                  title: "Daily Guidance",
                  description: "Updated horoscopes and cosmic events",
                },
                {
                  icon: Users,
                  title: "Expert Astrologers",
                  description: "Professional insight and interpretations",
                },
                {
                  icon: Zap,
                  title: "Real-time Updates",
                  description: "Instant cosmic alerts and notifications",
                },
              ].map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="p-6 rounded-lg bg-card border border-card-foreground/10 hover:border-primary/30 transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Zodiac Signs Section */}
        <section className="w-full py-20 px-4 bg-card/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                All Zodiac <span className="text-secondary">Signs</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Explore detailed information about your zodiac sign
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                "Aries",
                "Taurus",
                "Gemini",
                "Cancer",
                "Leo",
                "Virgo",
                "Libra",
                "Scorpio",
                "Sagittarius",
                "Capricorn",
                "Aquarius",
                "Pisces",
              ].map((sign) => (
                <Link
                  key={sign}
                  href={`/zodiac/${sign.toLowerCase()}`}
                  className="p-4 rounded-lg bg-background border border-card-foreground/10 hover:border-primary/50 hover:bg-card transition-all duration-300 text-center font-semibold hover:scale-105"
                >
                  {sign}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 px-4 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Explore Your Cosmic Destiny?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start your journey with AstroKalki today and unlock personalized
              insights into your life
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/read"
                className="px-8 py-4 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Get Your Personal Reading
              </Link>
              <Link
                href="/charts"
                className="px-8 py-4 border-2 border-secondary/50 hover:border-secondary text-foreground rounded-lg font-semibold transition-all duration-300 hover:bg-secondary/10"
              >
                View Sample Charts
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
