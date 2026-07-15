'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Heart, MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Circle {
  id: string;
  name: string;
  slug: string;
  description: string;
  pattern: string;
  primaryColor: string;
  memberCount: number;
  _count?: {
    members: number;
    posts: number;
  };
}

export function PatternCircles() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCircles = async () => {
      try {
        const response = await fetch('/api/community/circles');
        const data = await response.json();
        setCircles(data.circles || []);
      } catch (error) {
        console.error('Error fetching circles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCircles();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white/[0.02] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-[#f0eee9] mb-2">
            Pattern Circles
          </h2>
          <p className="text-[#9a9a9a] text-sm">
            Connect with others exploring the same patterns
          </p>
        </div>
      </div>

      {/* Circles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {circles.map((circle) => (
          <Link
            key={circle.id}
            href={`/community/circles/${circle.slug}`}
            className="group bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-lg p-6 transition-all duration-300"
          >
            {/* Header with color accent */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-serif text-lg opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: circle.primaryColor }}
              >
                {circle.pattern.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg text-[#f0eee9] group-hover:text-white transition-colors">
                  {circle.name}
                </h3>
                <p className="text-xs text-[#7a7a7a] capitalize mt-1">
                  {circle.pattern}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-[#9a9a9a] text-sm leading-relaxed mb-4 line-clamp-2">
              {circle.description}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-6 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#c9a96e]" />
                <span className="text-[#9a9a9a] text-sm">
                  {circle._count?.members || circle.memberCount} members
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#c9a96e]" />
                <span className="text-[#9a9a9a] text-sm">
                  {circle._count?.posts || 0} posts
                </span>
              </div>
            </div>

            {/* Join button hint */}
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[#c9a96e] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <span>View Circle</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {circles.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-[#7a7a7a] mx-auto mb-4 opacity-50" />
          <h3 className="text-[#f0eee9] font-serif text-lg mb-2">
            No circles yet
          </h3>
          <p className="text-[#7a7a7a] mb-6">
            Be the first to create a pattern circle
          </p>
        </div>
      )}
    </div>
  );
}
