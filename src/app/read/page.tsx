"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useState } from "react";
import { Sparkles, Heart, Briefcase, TrendingUp } from "lucide-react";

type ReadingType = "love" | "career" | "finance" | "general";

interface ReadingResult {
  type: ReadingType;
  title: string;
  icon: typeof Sparkles;
  reading: string;
}

const readingTypes: ReadingResult[] = [
  {
    type: "love",
    title: "Love & Relationships",
    icon: Heart,
    reading:
      "The stars suggest a harmonious period in your romantic life. Venus positions indicate openness to new connections while honoring existing bonds. Trust your intuition in matters of the heart.",
  },
  {
    type: "career",
    title: "Career & Success",
    icon: Briefcase,
    reading:
      "Jupiter's influence brings opportunities for professional growth. Consider taking calculated risks and showcasing your unique talents. Your efforts will be recognized by those in authority.",
  },
  {
    type: "finance",
    title: "Finances & Wealth",
    icon: TrendingUp,
    reading:
      "Mercury's favorable aspect suggests good fortune in financial matters. This is an excellent time to plan investments or start new ventures. Stay cautious but optimistic about opportunities.",
  },
  {
    type: "general",
    title: "General Guidance",
    icon: Sparkles,
    reading:
      "The cosmic energies align to bring clarity and purpose to your endeavors. Focus on personal growth and maintaining balance. The universe supports your journey toward fulfillment.",
  },
];

export default function ReadPage() {
  const [selectedReading, setSelectedReading] = useState<ReadingType>("general");
  const [showResult, setShowResult] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");

  const currentReading = readingTypes.find((r) => r.type === selectedReading);
  const IconComponent = currentReading?.icon || Sparkles;

  const handleGetReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (birthDate && birthTime && birthPlace) {
      setShowResult(true);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Header */}
        <section className="w-full py-16 px-4 bg-gradient-to-b from-card/50 to-background">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Get Your Cosmic <span className="text-primary">Reading</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover personalized astrological insights based on your birth
              chart
            </p>
          </div>
        </section>

        {/* Form Section */}
        <section className="w-full py-16 px-4 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-1">
                <form onSubmit={handleGetReading} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-card border border-card-foreground/10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Birth Time
                    </label>
                    <input
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-card border border-card-foreground/10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Birth Place
                    </label>
                    <input
                      type="text"
                      placeholder="City, Country"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-card border border-card-foreground/10 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    Generate Reading
                  </button>
                </form>
              </div>

              {/* Reading Types */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-bold mb-4">Select Reading Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  {readingTypes.map((reading) => {
                    const Icon = reading.icon;
                    return (
                      <button
                        key={reading.type}
                        onClick={() => {
                          setSelectedReading(reading.type);
                          setShowResult(false);
                        }}
                        className={`p-6 rounded-lg border-2 transition-all duration-300 text-left ${
                          selectedReading === reading.type
                            ? "border-primary bg-primary/10"
                            : "border-card-foreground/10 bg-card hover:border-primary/50"
                        }`}
                      >
                        <Icon className="w-6 h-6 mb-2 text-primary" />
                        <h4 className="font-semibold text-sm mb-1">
                          {reading.title}
                        </h4>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reading Result */}
        {showResult && currentReading && (
          <section className="w-full py-16 px-4 bg-card/30">
            <div className="max-w-4xl mx-auto">
              <div className="p-8 rounded-lg bg-gradient-to-br from-card to-background border border-primary/20">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {currentReading.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Personalized for {birthDate}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-lg leading-relaxed text-foreground">
                    {currentReading.reading}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-card-foreground/10">
                    {[
                      {
                        label: "Moon Phase",
                        value: "Waxing Gibbous",
                      },
                      {
                        label: "Planetary Alignment",
                        value: "Favorable",
                      },
                      {
                        label: "Cosmic Score",
                        value: "8.5/10",
                      },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          {item.label}
                        </p>
                        <p className="font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
