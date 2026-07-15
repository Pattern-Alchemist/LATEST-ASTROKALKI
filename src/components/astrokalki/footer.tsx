"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WHATSAPP_DIRECT_URL } from "@/lib/whatsapp";
import { useI18n } from "@/lib/i18n-context";

export default function Footer() {
  const [year, setYear] = useState(2026);
  useEffect(() => { setYear(new Date().getFullYear()); }, []);
  const { t } = useI18n();

  return (
    <footer className="relative border-t border-white/[0.04] bg-[#050505] mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-10 sm:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link
              href="/"
              className="text-editorial text-sm tracking-[0.25em] text-[#f0eee9] mb-3 block hover:text-[#c9a96e] transition-colors"
            >
              ASTROKALKI
            </Link>
            <p className="text-[11px] text-[#7a7a7a] leading-relaxed max-w-xs mb-4">
              {t("footer.tagline")}
            </p>
            <p className="text-[9px] text-[#5a5a5a] italic tracking-wider">
              {t("footer.motto")}
            </p>
          </div>

          {/* Sessions */}
          <div>
            <p className="text-[8px] tracking-[0.3em] uppercase text-[#c9a96e]/50 mb-4 font-medium">
              Sessions
            </p>
            <div className="space-y-2.5">
              <Link href="/services" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                All sessions
              </Link>
              <Link href="/services/relationship-pattern-analysis" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Relationship Pattern
              </Link>
              <Link href="/services/karmic-relationship-reading" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Karmic Reading
              </Link>
              <Link href="/services/emotional-pattern-decode" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Emotional Decode
              </Link>
              <Link href="/services/shadow-work-consultation" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Shadow Work
              </Link>
              <Link href="/services/life-direction-session" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Life Direction
              </Link>
              <Link href="/membership" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Membership
              </Link>
            </div>
          </div>

          {/* Insights */}
          <div>
            <p className="text-[8px] tracking-[0.3em] uppercase text-[#c9a96e]/50 mb-4 font-medium">
              Knowledge
            </p>
            <div className="space-y-2.5">
              <Link href="/patterns/atlas" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Pattern Atlas
              </Link>
              <Link href="/method" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                The Mirror Method
              </Link>
              <Link href="/research" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Original Research
              </Link>
              <Link href="/guides" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Long-form Guides
              </Link>
              <Link href="/insights" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                All Essays
              </Link>
              <Link href="/patterns" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Pattern Library
              </Link>
              <Link href="/email-course" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors" title="Free 5-day email course — Pattern Recognition Foundations">
                5-Day Course
              </Link>
              <Link href="/chart-reading" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors" title="Upload your birth chart — AI pattern recognition analysis">
                Chart Reading
              </Link>
              <Link href="/birth-chart" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors" title="Free Vedic birth chart calculator — JPL ephemeris, Lahiri ayanamsa, North Indian style SVG">
                Birth Chart Calculator
              </Link>
            </div>
          </div>

          {/* About */}
          <div>
            <p className="text-[8px] tracking-[0.3em] uppercase text-[#c9a96e]/50 mb-4 font-medium">
              The Practice
            </p>
            <div className="space-y-2.5">
              <Link href="/about" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                About AstroKalki
              </Link>
              <Link href="/methodology" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Methodology
              </Link>
              <Link href="/testimonials" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Testimonials
              </Link>
              <Link href="/case-studies" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors" title="Anonymised long-form client journeys — Problem, Pattern, Session, Shift">
                Case Studies
              </Link>
              <Link href="/faq" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                FAQ
              </Link>
              <Link href="/what-to-expect" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                What to Expect
              </Link>
              <Link href="/author/astrokalki" className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors">
                Author Profile
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[8px] tracking-[0.3em] uppercase text-[#c9a96e]/50 mb-4 font-medium">
              {t("footer.connect")}
            </p>
            <div className="space-y-3">
              <a
                href={WHATSAPP_DIRECT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] text-[#7a7a7a] hover:text-[#25D366] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                +91 89208 62931
              </a>
              <Link
                href="/#booking"
                className="block text-[12px] text-[#c9a96e] hover:text-[#f0eee9] transition-colors font-semibold"
              >
                {t("footer.bookSession")}
              </Link>
              <Link
                href="/refer"
                className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
                title="Refer a friend — earn a free 30-minute follow-up"
              >
                Refer a friend
              </Link>
              <Link
                href="/account"
                className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
              >
                Member portal
              </Link>
              <Link
                href="/ask-astrokalki"
                className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
              >
                Ask AstroKalki AI
              </Link>
              <Link
                href="/journal"
                className="block text-[11px] text-[#7a7a7a] hover:text-[#c9a96e] transition-colors"
              >
                Pattern Journal
              </Link>

              <div className="flex gap-3 mt-5">
                <a
                  href={WHATSAPP_DIRECT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full border border-[#25D366]/20 flex items-center justify-center hover:border-[#25D366]/50 hover:text-[#25D366] transition-all text-[#7a7a7a]"
                  aria-label="WhatsApp"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                {[
                  { label: "IG", href: "https://www.instagram.com/unfilteredbuddy_", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
                  { label: "YT", href: "https://youtube.com/@kalki_7", icon: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
                  { label: "X", href: "https://x.com/astrokalki", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-full border border-white/[0.05] flex items-center justify-center hover:border-[#c9a96e]/20 hover:text-[#c9a96e] transition-all text-[#7a7a7a]"
                    aria-label={social.label}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d={social.icon} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-5 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[9px] text-[#5a5a5a] tracking-wider">
            © {year} AstroKalki. {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/unsubscribe" className="text-[9px] text-[#5a5a5a]/60 tracking-wider hover:text-[#c9a96e] transition-colors">
              Unsubscribe
            </Link>
            <span className="text-[#3a3a3a]">·</span>
            <a
              href="/sitemap.xml"
              className="text-[9px] text-[#5a5a5a]/60 tracking-wider hover:text-[#c9a96e] transition-colors"
            >
              Sitemap
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
