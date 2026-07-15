'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SIGN_DESCRIPTIONS: Record<string, string> = {
  'Aries': 'Courageous, passionate, initiator. Pioneer of new beginnings.',
  'Taurus': 'Stable, sensual, grounded. Values security and beauty.',
  'Gemini': 'Curious, communicative, adaptable. Master of information.',
  'Cancer': 'Emotional, intuitive, nurturing. Home and family centered.',
  'Leo': 'Confident, creative, expressive. Natural leader and performer.',
  'Virgo': 'Analytical, practical, organized. Detail-oriented perfectionist.',
  'Libra': 'Diplomatic, aesthetic, balanced. Seeks harmony and partnership.',
  'Scorpio': 'Intense, mysterious, transformative. Deep emotional power.',
  'Sagittarius': 'Adventurous, philosophical, optimistic. Truth seeker.',
  'Capricorn': 'Ambitious, disciplined, responsible. Natural authority.',
  'Aquarius': 'Visionary, humanitarian, unconventional. Revolutionary thinker.',
  'Pisces': 'Compassionate, artistic, intuitive. Dreamer and healer.',
};

interface ChartResult {
  sun: string;
  moon: string;
  rising: string;
  description: string;
}

export default function BirthChartPage() {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [result, setResult] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  async function calculateChart(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const signs = ZODIAC_SIGNS;
      
      // Simple calculation based on inputs (for demo)
      // In production, would use real ephemeris calculations
      const date = new Date(birthDate);
      const dayOfMonth = date.getDate();
      
      const sunIndex = (dayOfMonth % 12);
      const moonIndex = (date.getMonth() + (dayOfMonth % 7)) % 12;
      const risingIndex = birthTime ? parseInt(birthTime.split(':')[0]) % 12 : dayOfMonth % 12;

      const result: ChartResult = {
        sun: signs[sunIndex],
        moon: signs[moonIndex],
        rising: signs[risingIndex],
        description: `Your birth chart reveals a ${signs[sunIndex]} Sun (core identity), ${signs[moonIndex]} Moon (emotional nature), and ${signs[risingIndex]} Rising (how others see you).`,
      };

      setResult(result);
      setShowEmail(true);
    } catch (error) {
      console.error('Calculation failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveResults() {
    if (!email) return;

    try {
      await fetch('/api/lead-magnets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          leadMagnetType: 'birth-chart',
          data: result,
        }),
      });
      setShowEmail(false);
    } catch (error) {
      console.error('Save failed:', error);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-white mb-2">Birth Chart Calculator</h1>
          <p className="text-slate-300">Get your Sun, Moon, and Rising signs instantly</p>
        </div>

        {!result ? (
          /* Form */
          <Card className="bg-slate-800/50 border-slate-700 p-8 mb-8">
            <form onSubmit={calculateChart} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Birth Date
                  </label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Birth Time (optional)
                  </label>
                  <Input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Birth Location
                </label>
                <Input
                  type="text"
                  placeholder="City, Country"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
              >
                {loading ? 'Calculating...' : 'Calculate My Chart'}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                For best accuracy, use your exact birth time from your birth certificate.
              </p>
            </form>
          </Card>
        ) : (
          /* Results */
          <div className="space-y-6">
            {/* Main Result */}
            <Card className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-white mb-2">Your Birth Chart</h2>
                <p className="text-slate-300">{result.description}</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { label: 'Sun Sign', value: result.sun, desc: 'Core Identity' },
                  { label: 'Moon Sign', value: result.moon, desc: 'Emotional Nature' },
                  { label: 'Rising Sign', value: result.rising, desc: 'First Impression' },
                ].map((sign) => (
                  <div key={sign.label} className="text-center">
                    <p className="text-sm text-slate-400 mb-1">{sign.desc}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                      {sign.value}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">{SIGN_DESCRIPTIONS[sign.value]}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Sign Details */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Your Sun', value: result.sun },
                { title: 'Your Moon', value: result.moon },
                { title: 'Your Rising', value: result.rising },
              ].map((item) => (
                <Card key={item.title} className="bg-slate-800/50 border-slate-700 p-6">
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-amber-400 font-medium mb-3">{item.value}</p>
                  <p className="text-sm text-slate-300">{SIGN_DESCRIPTIONS[item.value]}</p>
                </Card>
              ))}
            </div>

            {/* CTA */}
            {showEmail ? (
              <Card className="bg-slate-800/50 border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Save Your Results</h3>
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Button
                    onClick={saveResults}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  >
                    Save & Get Deep Dive Guide
                  </Button>
                  <p className="text-xs text-slate-400">
                    We&apos;ll email you a detailed interpretation of your chart.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="flex gap-4">
                <Button
                  onClick={() => setResult(null)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Calculate Again
                </Button>
                <Button
                  asChild
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                >
                  <a href="/services">Book Deep Reading</a>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
