"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useState } from "react";
import Link from "next/link";

type HoroscopePeriod = "today" | "week" | "month";

interface HoroscopeData {
  sign: string;
  symbol: string;
  dates: string;
}

const zodiacSigns: HoroscopeData[] = [
  { sign: "Aries", symbol: "♈", dates: "Mar 21 - Apr 19" },
  { sign: "Taurus", symbol: "♉", dates: "Apr 20 - May 20" },
  { sign: "Gemini", symbol: "♊", dates: "May 21 - Jun 20" },
  { sign: "Cancer", symbol: "♋", dates: "Jun 21 - Jul 22" },
  { sign: "Leo", symbol: "♌", dates: "Jul 23 - Aug 22" },
  { sign: "Virgo", symbol: "♍", dates: "Aug 23 - Sep 22" },
  { sign: "Libra", symbol: "♎", dates: "Sep 23 - Oct 22" },
  { sign: "Scorpio", symbol: "♏", dates: "Oct 23 - Nov 21" },
  { sign: "Sagittarius", symbol: "♐", dates: "Nov 22 - Dec 21" },
  { sign: "Capricorn", symbol: "♑", dates: "Dec 22 - Jan 19" },
  { sign: "Aquarius", symbol: "♒", dates: "Jan 20 - Feb 18" },
  { sign: "Pisces", symbol: "♓", dates: "Feb 19 - Mar 20" },
];

const horoscopeContent = {
  today: {
    title: "Today's Horoscope",
    content:
      "The stars align to bring fresh energy and new opportunities your way. Focus on what truly matters and trust your instincts. A meaningful conversation may reveal important insights.",
  },
  week: {
    title: "This Week's Horoscope",
    content:
      "An auspicious week ahead! The planetary alignments favor new beginnings and personal growth. Expect clarity in a confusing situation by mid-week. Use this momentum to pursue your goals.",
  },
  month: {
    title: "This Month's Horoscope",
    content:
      "This month brings transformative energies. Major planetary movements support your endeavors in career and relationships. Embrace changes gracefully and remain open to unexpected blessings.",
  },
};

export default function HoroscopePage() {
  const [selectedSign, setSelectedSign] = useState("Aries");
  const [selectedPeriod, setSelectedPeriod] = useState<HoroscopePeriod>(
    "today"
  );

  const currentSign = zodiacSigns.find((s) => s.sign === selectedSign);
  const content = horoscopeContent[selectedPeriod];

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Header */}
        <section className="w-full py-16 px-4 bg-gradient-to-b from-card/50 to-background">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Daily <span className="text-accent">Horoscopes</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Get personalized cosmic guidance for your zodiac sign
            </p>
          </div>
        </section>

        {/* Period Selector */}
        <section className="w-full py-8 px-4 bg-background border-b border-card-foreground/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-4 justify-center">
              {(["today", "week", "month"] as HoroscopePeriod[]).map(
                (period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 capitalize ${
                      selectedPeriod === period
                        ? "bg-primary text-white"
                        : "bg-card hover:bg-card-foreground/10 text-foreground"
                    }`}
                  >
                    {period === "today"
                      ? "Today"
                      : period === "week"
                        ? "This Week"
                        : "This Month"}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="w-full py-16 px-4 bg-background">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Zodiac Selector */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-bold mb-4">Select Your Sign</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {zodiacSigns.map((sign) => (
                  <button
                    key={sign.sign}
                    onClick={() => setSelectedSign(sign.sign)}
                    className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
                      selectedSign === sign.sign
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-card border-2 border-card-foreground/10 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{sign.symbol}</span>
                      <div>
                        <p className="font-semibold text-sm">{sign.sign}</p>
                        <p className="text-xs text-muted-foreground">
                          {sign.dates}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Horoscope Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Sign Header */}
              <div className="p-8 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30">
                <div className="flex items-center gap-6">
                  <div className="text-6xl">{currentSign?.symbol}</div>
                  <div>
                    <h2 className="text-3xl font-bold">{currentSign?.sign}</h2>
                    <p className="text-muted-foreground">{currentSign?.dates}</p>
                  </div>
                </div>
              </div>

              {/* Horoscope Text */}
              <div className="p-8 rounded-lg bg-card border border-card-foreground/10 space-y-4">
                <h3 className="text-2xl font-bold">{content.title}</h3>
                <p className="text-lg leading-relaxed text-foreground">
                  {content.content}
                </p>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: "Love",
                    icon: "💕",
                    content: "Romantic energies are strong. A meaningful connection awaits.",
                  },
                  {
                    title: "Work",
                    icon: "💼",
                    content:
                      "Professional opportunities align with your ambitions.",
                  },
                  {
                    title: "Health",
                    icon: "💪",
                    content: "Take time for self-care and wellness practices.",
                  },
                ].map((category) => (
                  <div
                    key={category.title}
                    className="p-4 rounded-lg bg-card border border-card-foreground/10 hover:border-primary/30 transition-all"
                  >
                    <div className="text-2xl mb-2">{category.icon}</div>
                    <h4 className="font-semibold mb-2">{category.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {category.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Lucky Elements */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-lg bg-card/50 border border-card-foreground/10">
                {[
                  { label: "Lucky Number", value: "7" },
                  { label: "Lucky Color", value: "Red" },
                  { label: "Lucky Day", value: "Tuesday" },
                  { label: "Lucky Time", value: "3 PM" },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <p className="font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-16 px-4 bg-card/30">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold">Want Deeper Insights?</h2>
            <p className="text-lg text-muted-foreground">
              Get personalized readings based on your complete birth chart
            </p>
            <Link
              href="/read"
              className="inline-block px-8 py-4 bg-gradient-to-r from-accent to-secondary hover:from-secondary hover:to-accent text-white rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Get Full Reading
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
