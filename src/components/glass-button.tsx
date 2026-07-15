import Link from 'next/link';
import React from 'react';

interface GlassButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  external?: boolean;
}

export function GlassButton({
  href,
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  external = false,
}: GlassButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'glass-button bg-[#c9a96e]/10 border-[#c9a96e]/25 text-[#c9a96e] hover:bg-[#c9a96e]/20 hover:border-[#c9a96e]/40',
    secondary: 'glass-button bg-white/5 border-white/15 text-white hover:bg-white/10 hover:border-white/25',
    outline: 'border border-[#c9a96e]/40 text-[#c9a96e] hover:border-[#c9a96e]/60 hover:bg-[#c9a96e]/5 backdrop-blur-sm',
  };

  const baseClasses = `relative inline-flex items-center justify-center font-montserrat font-semibold tracking-wide transition-all duration-400 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={baseClasses}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={baseClasses} disabled={disabled}>
      {children}
    </button>
  );
}
