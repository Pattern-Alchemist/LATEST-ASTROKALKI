'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getPatternColor, getAllPatternColors } from '@/lib/astrology/pattern-colors';

// Event types for the timeline
interface TimelineEvent {
  id: string;
  date: Date;
  type: 'session' | 'insight' | 'journal' | 'milestone'; // event type
  pattern: string; // atlas pattern slug
  title: string;
  description?: string;
  color?: string;
}

const PATTERN_NAMES: Record<string, string> = {
  'the-rescuer': 'The Rescuer',
  'the-abandonment': 'Abandonment',
  'the-performer': 'The Performer',
  'the-invisible-child': 'Invisible Child',
  'the-emotional-caretaker': 'Emotional Caretaker',
  'the-self-sabotage': 'Self-Sabotage',
  'the-chaser': 'The Chaser',
  'the-avoider': 'The Avoider',
  'the-outsider': 'The Outsider',
  'the-hyper-independent': 'Hyper-Independent',
  'the-overthinker': 'The Overthinker',
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  session: '📍',
  insight: '💡',
  journal: '✍️',
  milestone: '⭐',
};

interface PatternTimelineProps {
  events?: TimelineEvent[];
  height?: number;
}

export function PatternTimeline({ 
  events = generateSampleEvents(),
  height = 600,
}: PatternTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    if (!svgRef.current || events.length === 0) return;

    const margin = { top: 60, right: 20, bottom: 40, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const effectiveHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .style('background', '#050505')
      .style('font-family', 'inherit');

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(events, d => new Date(d.date)) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(Object.keys(getAllPatternColors()))
      .range([0, effectiveHeight])
      .padding(0.6);

    // Background grid
    g.append('g')
      .attr('stroke', '#1a1a1a')
      .attr('stroke-dasharray', '4')
      .call(d3.axisBottom(xScale)
        .tickSize(effectiveHeight)
        .tickFormat(() => '')
      )
      .style('font-size', '0px');

    // Timeline axis (bottom)
    const xAxis = d3.axisBottom(xScale)
      .ticks(d3.timeMonth.every(1))
      .tickFormat((d: any) => d3.timeFormat('%b %d')(d));

    g.append('g')
      .attr('transform', `translate(0,${effectiveHeight})`)
      .call(xAxis)
      .style('color', '#7a7a7a')
      .style('font-size', '12px');

    // Pattern labels on left
    g.append('g')
      .call(d3.axisLeft(yScale) as any)
      .style('color', '#7a7a7a')
      .style('font-size', '11px');

    // Draw connecting line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', effectiveHeight / 2)
      .attr('y2', effectiveHeight / 2)
      .attr('stroke', '#2a2a2a')
      .attr('stroke-width', 2)
      .attr('opacity', 0.3);

    // Draw events
    const circles = g.selectAll('.event')
      .data(events)
      .enter()
      .append('g')
      .attr('class', 'event')
      .attr('data-id', d => d.id);

    // Event circles
    circles.append('circle')
      .attr('cx', d => xScale(new Date(d.date)))
      .attr('cy', d => {
        const y = yScale(d.pattern);
        return y ? y + yScale.bandwidth() / 2 : effectiveHeight / 2;
      })
      .attr('r', d => hoveredEvent === d.id ? 8 : 5)
      .attr('fill', d => d.color || getPatternColor(d.pattern))
      .attr('stroke', '#e8e6e1')
      .attr('stroke-width', 1)
      .attr('opacity', d => hoveredEvent === d.id ? 1 : 0.8)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseover', function(this: any, event: any, d: any) {
        setHoveredEvent(d.id);
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 8)
          .attr('opacity', 1);
      })
      .on('mouseout', function(this: any) {
        setHoveredEvent(null);
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 5)
          .attr('opacity', 0.8);
      })
      .on('click', (event, d) => {
        setSelectedEvent(d);
      });

    // Event type icons
    circles.append('text')
      .attr('x', d => xScale(new Date(d.date)))
      .attr('y', d => {
        const y = yScale(d.pattern);
        return y ? y + yScale.bandwidth() / 2 - 16 : effectiveHeight / 2 - 16;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .text(d => EVENT_TYPE_ICONS[d.type] || '•')
      .style('pointer-events', 'none');

    // Title labels on hover
    circles.append('title')
      .text(d => `${d.title}\n${PATTERN_NAMES[d.pattern] || d.pattern}\n${new Date(d.date).toLocaleDateString()}`);

  }, [events, hoveredEvent, height]);

  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-card/50 p-4">
        <svg
          ref={svgRef}
          className="w-full"
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        {Object.entries(EVENT_TYPE_ICONS).map(([type, icon]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="text-sm">{icon}</span>
            <span className="text-foreground/60">{type}</span>
          </div>
        ))}
      </div>

      {/* Selected event details */}
      {selectedEvent && (
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{EVENT_TYPE_ICONS[selectedEvent.type]}</span>
                <h3 className="font-semibold text-foreground">{selectedEvent.title}</h3>
              </div>
              <p className="text-sm text-foreground/70 mb-2">
                {PATTERN_NAMES[selectedEvent.pattern] || selectedEvent.pattern}
              </p>
              {selectedEvent.description && (
                <p className="text-sm text-foreground/60">{selectedEvent.description}</p>
              )}
              <p className="text-xs text-foreground/50 mt-2">
                {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-foreground/40 hover:text-foreground/60"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function generateSampleEvents(): TimelineEvent[] {
  const now = new Date();
  const patterns = Object.keys(getAllPatternColors());
  
  return [
    {
      id: '1',
      date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      type: 'session',
      pattern: 'the-performer',
      title: 'First Pattern Recognition',
      description: 'Identified performing pattern in relationships',
    },
    {
      id: '2',
      date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      type: 'insight',
      pattern: 'the-emotional-caretaker',
      title: 'Emotional caretaker loop discovered',
      description: 'Recognition of people-pleasing pattern',
    },
    {
      id: '3',
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      type: 'journal',
      pattern: 'the-abandonment',
      title: 'Journal entry: Breaking free',
      description: 'Writing about new awareness',
    },
    {
      id: '4',
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      type: 'milestone',
      pattern: 'the-self-sabotage',
      title: 'Made first conscious choice',
      description: 'Chose differently in familiar situation',
    },
    {
      id: '5',
      date: now,
      type: 'session',
      pattern: 'the-overthinker',
      title: 'Deep integration session',
      description: 'Going deeper into pattern work',
    },
  ];
}
