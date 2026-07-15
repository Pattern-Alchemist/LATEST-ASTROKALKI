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

const COMPATIBILITY_MATRIX: Record<string, Record<string, number>> = {
  'Aries': { 'Aries': 75, 'Taurus': 65, 'Gemini': 85, 'Cancer': 60, 'Leo': 90, 'Virgo': 70, 'Libra': 75, 'Scorpio': 70, 'Sagittarius': 85, 'Capricorn': 70, 'Aquarius': 80, 'Pisces': 65 },
  'Taurus': { 'Aries': 65, 'Taurus': 80, 'Gemini': 70, 'Cancer': 85, 'Leo': 70, 'Virgo': 90, 'Libra': 70, 'Scorpio': 75, 'Sagittarius': 65, 'Capricorn': 85, 'Aquarius': 65, 'Pisces': 80 },
  'Gemini': { 'Aries': 85, 'Taurus': 70, 'Gemini': 85, 'Cancer': 70, 'Leo': 80, 'Virgo': 85, 'Libra': 90, 'Scorpio': 65, 'Sagittarius': 80, 'Capricorn': 70, 'Aquarius': 85, 'Pisces': 70 },
  'Cancer': { 'Aries': 60, 'Taurus': 85, 'Gemini': 70, 'Cancer': 80, 'Leo': 70, 'Virgo': 80, 'Libra': 70, 'Scorpio': 90, 'Sagittarius': 65, 'Capricorn': 75, 'Aquarius': 65, 'Pisces': 85 },
  'Leo': { 'Aries': 90, 'Taurus': 70, 'Gemini': 80, 'Cancer': 70, 'Leo': 80, 'Virgo': 70, 'Libra': 75, 'Scorpio': 70, 'Sagittarius': 85, 'Capricorn': 70, 'Aquarius': 75, 'Pisces': 70 },
  'Virgo': { 'Aries': 70, 'Taurus': 90, 'Gemini': 85, 'Cancer': 80, 'Leo': 70, 'Virgo': 80, 'Libra': 75, 'Scorpio': 75, 'Sagittarius': 70, 'Capricorn': 85, 'Aquarius': 75, 'Pisces': 80 },
  'Libra': { 'Aries': 75, 'Taurus': 70, 'Gemini': 90, 'Cancer': 70, 'Leo': 75, 'Virgo': 75, 'Libra': 80, 'Scorpio': 70, 'Sagittarius': 75, 'Capricorn': 70, 'Aquarius': 85, 'Pisces': 75 },
  'Scorpio': { 'Aries': 70, 'Taurus': 75, 'Gemini': 65, 'Cancer': 90, 'Leo': 70, 'Virgo': 75, 'Libra': 70, 'Scorpio': 80, 'Sagittarius': 70, 'Capricorn': 80, 'Aquarius': 70, 'Pisces': 85 },
  'Sagittarius': { 'Aries': 85, 'Taurus': 65, 'Gemini': 80, 'Cancer': 65, 'Leo': 85, 'Virgo': 70, 'Libra': 75, 'Scorpio': 70, 'Sagittarius': 80, 'Capricorn': 70, 'Aquarius': 80, 'Pisces': 70 },
  'Capricorn': { 'Aries': 70, 'Taurus': 85, 'Gemini': 70, 'Cancer': 75, 'Leo': 70, 'Virgo': 85, 'Libra': 70, 'Scorpio': 80, 'Sagittarius': 70, 'Capricorn': 80, 'Aquarius': 75, 'Pisces': 75 },
  'Aquarius': { 'Aries': 80, 'Taurus': 65, 'Gemini': 85, 'Cancer': 65, 'Leo': 75, 'Virgo': 75, 'Libra': 85, 'Scorpio': 70, 'Sagittarius': 80, 'Capricorn': 75, 'Aquarius': 85, 'Pisces': 75 },
  'Pisces': { 'Aries': 65, 'Taurus': 80, 'Gemini': 70, 'Cancer': 85, 'Leo': 70, 'Virgo': 80, 'Libra': 75, 'Scorpio': 85, 'Sagittarius': 70, 'Capricorn': 75, 'Aquarius': 75, 'Pisces': 85 },
};

interface CompatibilityResult {
  person1Sun: string;
  person2Sun: string;
  score: number;
  description: string;
}

export default function CompatibilityPage() {
  const [person1Date, setPerson1Date] = useState('');
  const [person2Date, setPerson2Date] = useState('');
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculateCompatibility(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const date1 = new Date(person1Date);
      const date2 = new Date(person2Date);
      
      const index1 = (date1.getDate() % 12);
      const index2 = (date2.getDate() % 12);
      
      const sign1 = ZODIAC_SIGNS[index1];
      const sign2 = ZODIAC_SIGNS[index2];
      
      const score = COMPATIBILITY_MATRIX[sign1][sign2];

      let description = '';
      if (score >= 85) {
        description = 'Excellent compatibility! You have strong chemistry and understanding.';
      } else if (score >= 75) {
        description = 'Good compatibility. You complement each other well.';
      } else if (score >= 70) {
        description = 'Moderate compatibility. You have potential but need understanding.';
      } else {
        description = 'Different energies. The relationship requires conscious effort but growth is possible.';
      }

      setResult({
        person1Sun: sign1,
        person2Sun: sign2,
        score,
        description,
      });
    } catch (error) {
      console.error('Calculation failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-white mb-2">Astrological Compatibility</h1>
          <p className="text-slate-300">Check chart alignment with another person</p>
        </div>

        {!result ? (
          /* Form */
          <Card className="bg-slate-800/50 border-slate-700 p-8 mb-8">
            <form onSubmit={calculateCompatibility} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your Birth Date
                </label>
                <Input
                  type="date"
                  value={person1Date}
                  onChange={(e) => setPerson1Date(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Their Birth Date
                </label>
                <Input
                  type="date"
                  value={person2Date}
                  onChange={(e) => setPerson2Date(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold"
              >
                {loading ? 'Calculating...' : 'Check Compatibility'}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                This is a fun tool based on sun signs. True compatibility is complex!
              </p>
            </form>
          </Card>
        ) : (
          /* Results */
          <div className="space-y-6">
            {/* Score */}
            <Card className="bg-gradient-to-br from-pink-500/20 to-rose-600/20 border border-pink-500/30 p-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-white mb-2">Compatibility Score</h2>
                
                <div className="my-8">
                  <div className="text-6xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                    {result.score}%
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-pink-400 mb-1">{result.person1Sun}</p>
                      <p className="text-sm text-slate-400">You</p>
                    </div>
                    <span className="text-3xl text-slate-400">♥</span>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-rose-400 mb-1">{result.person2Sun}</p>
                      <p className="text-sm text-slate-400">Them</p>
                    </div>
                  </div>

                  <p className="text-lg text-slate-300 mt-6">{result.description}</p>
                </div>
              </div>
            </Card>

            {/* Details */}
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <h3 className="font-semibold text-white mb-4">What This Means</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex gap-2">
                  <span className="text-amber-400">→</span>
                  <span>This score reflects sun sign compatibility based on astrological elements and modes.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">→</span>
                  <span>Real compatibility involves moon signs, Venus (love), Mars (desire), and more.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">→</span>
                  <span>Any combination can work with awareness, communication, and commitment.</span>
                </li>
              </ul>
            </Card>

            {/* CTA */}
            <div className="flex gap-4">
              <Button
                onClick={() => setResult(null)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Check Another Match
              </Button>
              <Button
                asChild
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
              >
                <a href="/services/relationship-pattern-analysis">Deep Relationship Reading</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
