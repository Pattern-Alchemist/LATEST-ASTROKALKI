/**
 * Mood Trends Visualization
 * 
 * Displays pattern activation trends over time using Recharts.
 * Shows which patterns are most active, their intensity progression,
 * and mood correlations across the calendar.
 */

'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getPatternColor } from '@/lib/astrology/pattern-colors';

interface MoodTrendData {
  date: string;
  patterns: Record<string, number>; // pattern slug → intensity
  dominant?: string;
}

interface MoodTrendsProps {
  data: MoodTrendData[];
  title?: string;
  timeRange?: '7d' | '30d' | '90d';
}

/**
 * Transform raw pattern data into chart-friendly format
 */
function transformData(data: MoodTrendData[]) {
  return data.map((d) => ({
    date: d.date,
    ...d.patterns,
  }));
}

/**
 * Get top patterns by frequency across dataset
 */
function getTopPatterns(data: MoodTrendData[], limit: number = 5): string[] {
  const patternFreq = new Map<string, number>();
  
  for (const day of data) {
    for (const [pattern, intensity] of Object.entries(day.patterns)) {
      if (intensity > 0.3) {
        patternFreq.set(pattern, (patternFreq.get(pattern) || 0) + intensity);
      }
    }
  }
  
  return Array.from(patternFreq.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([pattern]) => pattern);
}

/**
 * Mood Trends Chart Component
 */
export function MoodTrends({
  data,
  title = 'Your Mood Patterns Over Time',
  timeRange = '30d',
}: MoodTrendsProps) {
  const topPatterns = useMemo(() => getTopPatterns(data), [data]);
  const chartData = useMemo(() => transformData(data), [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full py-8 text-center text-[#7a7a7a]">
        <p className="text-sm font-light">No mood data available yet.</p>
      </div>
    );
  }

  const timeLabel = timeRange === '7d' ? '7 Days' : timeRange === '30d' ? '30 Days' : '90 Days';

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-[10px] tracking-[0.5em] uppercase text-[#c9a96e]/60 mb-2 font-light">
          Pattern Analytics
        </p>
        <h3 className="text-lg sm:text-xl font-serif font-light text-[#f0eee9] mb-1">
          {title}
        </h3>
        <p className="text-xs text-[#7a7a7a] font-light">
          Last {timeLabel}
        </p>
      </div>

      {/* Line Chart - Intensity over time */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
        <p className="text-xs text-[#9a9a9a] font-light mb-4">Activation Intensity</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#ffffff08"
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              stroke="#7a7a7a"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#7a7a7a' }}
            />
            <YAxis 
              domain={[0, 1]} 
              stroke="#7a7a7a"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#7a7a7a' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #c9a96e40',
                borderRadius: '4px',
              }}
              labelStyle={{ color: '#c9a96e' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            {topPatterns.map((pattern) => (
              <Line
                key={pattern}
                type="monotone"
                dataKey={pattern}
                stroke={getPatternColor(pattern)}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                name={pattern.replace(/-/g, ' ')}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Area Chart - Stacked intensity */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
        <p className="text-xs text-[#9a9a9a] font-light mb-4">Pattern Distribution</p>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#ffffff08"
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              stroke="#7a7a7a"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#7a7a7a' }}
            />
            <YAxis 
              domain={[0, 1]} 
              stroke="#7a7a7a"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#7a7a7a' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #c9a96e40',
                borderRadius: '4px',
              }}
              labelStyle={{ color: '#c9a96e' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
            />
            {topPatterns.map((pattern, i) => (
              <Area
                key={pattern}
                type="monotone"
                dataKey={pattern}
                fill={getPatternColor(pattern)}
                stroke={getPatternColor(pattern)}
                fillOpacity={0.3 + i * 0.05}
                isAnimationActive={false}
                name={pattern.replace(/-/g, ' ')}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pattern Legend */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
        <p className="text-xs text-[#9a9a9a] font-light mb-4">Top Patterns</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {topPatterns.map((pattern) => (
            <div key={pattern} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getPatternColor(pattern) }}
              />
              <span className="text-xs text-[#9a9a9a] font-light">
                {pattern.replace(/-/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
