import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { BarChart, LineChart, PieChart } from "lucide-react";

interface ChartData {
  name: string;
  icon: typeof BarChart;
  description: string;
  features: string[];
}

const chartTypes: ChartData[] = [
  {
    name: "Natal Chart",
    icon: PieChart,
    description:
      "A complete snapshot of the zodiac at your exact time and place of birth",
    features: [
      "Sun, Moon & Rising Signs",
      "Planetary Positions",
      "Aspects & Configurations",
      "House Placements",
    ],
  },
  {
    name: "Transit Chart",
    icon: LineChart,
    description: "Shows current planetary movements and their influence on you",
    features: [
      "Current Transits",
      "Aspect Timeline",
      "Upcoming Events",
      "Predictions",
    ],
  },
  {
    name: "Compatibility Chart",
    icon: BarChart,
    description: "Analyze cosmic compatibility with another person",
    features: [
      "Synastry Analysis",
      "Composite Chart",
      "Relationship Insights",
      "Growth Potential",
    ],
  },
];

export default function ChartsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Header Section */}
        <section className="w-full py-16 px-4 bg-gradient-to-b from-card/50 to-background">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Astrological <span className="text-secondary">Charts</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore detailed cosmic charts that reveal your planetary
              influences and cosmic destiny
            </p>
          </div>
        </section>

        {/* Chart Types Section */}
        <section className="w-full py-20 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {chartTypes.map((chart) => {
                const IconComponent = chart.icon;
                return (
                  <div
                    key={chart.name}
                    className="p-8 rounded-lg bg-card border border-card-foreground/10 hover:border-secondary/50 transition-all duration-300 group"
                  >
                    <div className="w-14 h-14 bg-secondary/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary/30 transition-colors">
                      <IconComponent className="w-7 h-7 text-secondary" />
                    </div>

                    <h3 className="text-2xl font-bold mb-2">{chart.name}</h3>
                    <p className="text-muted-foreground mb-6">
                      {chart.description}
                    </p>

                    <ul className="space-y-2 mb-6">
                      {chart.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="w-1.5 h-1.5 bg-secondary rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/read"
                      className="inline-block px-6 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg font-semibold transition-colors duration-200"
                    >
                      View Chart
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sample Chart Display */}
        <section className="w-full py-20 px-4 bg-card/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                Sample Natal <span className="text-primary">Chart</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                See how our charts look and what information they provide
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart Preview */}
              <div className="p-8 rounded-lg bg-background border border-card-foreground/10 flex items-center justify-center min-h-80">
                <div className="relative w-full aspect-square max-w-sm">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        ♈
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sun in Aries
                      </p>
                    </div>
                  </div>

                  {/* Planets */}
                  {[
                    { symbol: "☉", top: "10%", left: "50%", label: "Sun" },
                    { symbol: "☽", top: "30%", left: "70%", label: "Moon" },
                    { symbol: "☿", top: "70%", left: "75%", label: "Mercury" },
                    { symbol: "♀", top: "75%", left: "30%", label: "Venus" },
                  ].map((planet) => (
                    <div
                      key={planet.label}
                      className="absolute w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-xs font-bold text-primary cursor-pointer hover:bg-primary/40 transition-all group"
                      style={{ top: planet.top, left: planet.left }}
                      title={planet.label}
                    >
                      {planet.symbol}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Info */}
              <div className="space-y-6">
                <div className="p-6 rounded-lg bg-card border border-card-foreground/10">
                  <h3 className="text-xl font-bold mb-4">Chart Information</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Sun Sign", value: "Aries" },
                      { label: "Moon Sign", value: "Pisces" },
                      { label: "Rising Sign", value: "Sagittarius" },
                      { label: "Birth Date", value: "April 15, 1990" },
                      { label: "Birth Time", value: "14:30:00" },
                      { label: "Birth Place", value: "New York, USA" },
                    ].map((info) => (
                      <div
                        key={info.label}
                        className="flex items-center justify-between text-sm border-b border-card-foreground/10 pb-3 last:border-0"
                      >
                        <span className="text-muted-foreground">
                          {info.label}
                        </span>
                        <span className="font-semibold">{info.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-lg bg-gradient-to-br from-secondary/20 to-accent/20 border border-secondary/30 rounded-lg">
                  <h3 className="font-bold mb-2">Quick Insights</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Strong communication abilities (Mercury placement)</li>
                    <li>✓ Emotional depth and intuition (Moon in Pisces)</li>
                    <li>✓ Natural leadership and confidence (Sagittarius rising)</li>
                    <li>✓ Creative and adventurous spirit (Multiple fire signs)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-20 px-4 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Generate Your Personal Chart
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Get detailed astrological charts based on your unique birth
              information
            </p>
            <Link
              href="/read"
              className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Create My Chart Now
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
