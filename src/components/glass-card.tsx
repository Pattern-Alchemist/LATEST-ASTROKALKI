import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  deep?: boolean;
}

export function GlassCard({
  children,
  className = '',
  hover = true,
  glow = false,
  deep = false,
}: GlassCardProps) {
  const baseClasses = deep ? 'glass-card-deep' : 'glass-card';
  const hoverClasses = hover ? 'hover:shadow-lg hover:border-[#c9a96e]/20' : '';
  const glowClasses = glow ? 'neon-gold-glow' : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${glowClasses} ${className}`}>
      {children}
    </div>
  );
}
