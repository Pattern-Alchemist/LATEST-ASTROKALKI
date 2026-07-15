'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GlassButton } from './glass-button';

export function LuxuryHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-[#050505]/40 backdrop-blur-xl border-b border-[#c9a96e]/10">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#a8884d] flex items-center justify-center group-hover:shadow-lg group-hover:shadow-[#c9a96e]/20 transition-all duration-300">
            <span className="font-cormorant text-lg font-bold text-[#050505]">A</span>
          </div>
          <span className="hidden sm:block font-cormorant text-xl font-medium text-[#e8e6e1]">AstroKalki</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Community', href: '/community' },
            { label: 'Forum', href: '/forum' },
            { label: 'Preferences', href: '/preferences' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-montserrat text-[#9a9a9a] hover:text-[#c9a96e] transition-colors duration-300 relative group"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-[#c9a96e] to-transparent group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden sm:block">
          <GlassButton href="/booking" size="sm" variant="primary">
            Book Now
          </GlassButton>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden w-10 h-10 flex flex-col gap-1.5 justify-center items-center group"
        >
          <span className={`w-6 h-0.5 bg-[#c9a96e] transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`w-6 h-0.5 bg-[#c9a96e] transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`w-6 h-0.5 bg-[#c9a96e] transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#050505]/80 backdrop-blur-xl border-t border-[#c9a96e]/10">
          <nav className="flex flex-col gap-4 px-6 py-6">
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Community', href: '/community' },
              { label: 'Forum', href: '/forum' },
              { label: 'Preferences', href: '/preferences' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-montserrat text-[#9a9a9a] hover:text-[#c9a96e] transition-colors duration-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <GlassButton href="/booking" size="md" variant="primary" className="w-full mt-4">
              Book Now
            </GlassButton>
          </nav>
        </div>
      )}
    </header>
  );
}
