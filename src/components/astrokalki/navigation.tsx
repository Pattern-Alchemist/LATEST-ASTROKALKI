"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";

const navItemKeys = [
  { key: "nav.pattern", href: "/#micro-diagnosis" },
  { key: "nav.mirror", href: "/#mirror" },
  { key: "nav.decoding", href: "/#services" },
  { key: "nav.whispers", href: "/#testimonials" },
  { key: "nav.insights", href: "/#insights" },
  { key: "nav.source", href: "/#about" },
];

const secondTierLinks = [
  { label: "Patterns", href: "/patterns/atlas" },
  { label: "Method", href: "/method" },
  { label: "Pricing", href: "/pricing" },
  { label: "Research", href: "/research" },
  { label: "Guides", href: "/guides" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);

      // Calculate scroll progress (how far down the page)
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setScrollProgress(Math.min((scrollTop / docHeight) * 100, 100));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Different nav treatment on deep pages (no transparent gradient — they have header bars)
  const navBg = isHome
    ? scrolled
      ? "bg-[#050505]/95 backdrop-blur-xl border-b border-white/[0.04]"
      : "bg-gradient-to-b from-[#050505]/40 to-transparent"
    : "bg-[#050505]/95 backdrop-blur-xl border-b border-white/[0.04]";

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${navBg}`}>
        {/* Scroll progress bar — thin gold line that fills as you scroll.
            Only visible on the homepage (SPA) where scroll tracking matters. */}
        {isHome && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px] z-10"
            style={{ background: "rgba(255,255,255,0.03)" }}
            aria-hidden="true"
          >
            <div
              className="h-full transition-[width] duration-150 ease-out"
              style={{
                width: `${scrollProgress}%`,
                background: "linear-gradient(90deg, #c9a96e 0%, #e8d5b7 100%)",
              }}
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo — minimal */}
            <Link
              href="/"
              className="text-[12px] sm:text-[13px] tracking-[0.4em] uppercase text-[#e8e6e1] hover:text-[#c9a96e] transition-colors duration-500 shrink-0 font-light"
            >
              AstroKalki
            </Link>

            {/* Desktop nav — homepage shows section anchors, deep pages show top-level routes */}
            <div className="hidden lg:flex items-center gap-12 xl:gap-14">
              {(isHome ? navItemKeys : secondTierLinks.map((l) => ({ key: l.label, href: l.href }))).map((item) => {
                const isAnchor = item.href.startsWith("/#");
                const label = isHome ? t(item.key) : item.key;
                // Mark the current page's nav link with aria-current="page"
                // so screen readers + assistive tech announce "current page".
                // Matches both exact routes and nested children (e.g.
                // /services/relationship-pattern-analysis → "Services" is current).
                const isActive =
                  !isAnchor &&
                  (pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href + "/")));
                if (isAnchor) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="text-[11px] sm:text-[12px] tracking-[0.2em] uppercase text-[#9a9a9a] hover:text-[#c9a96e] transition-colors duration-500 font-light whitespace-nowrap"
                    >
                      {label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`text-[11px] sm:text-[12px] tracking-[0.2em] uppercase transition-colors duration-500 font-light whitespace-nowrap ${
                      isActive
                        ? "text-[#c9a96e] border-b border-[#c9a96e]/50 pb-1"
                        : "text-[#9a9a9a] hover:text-[#c9a96e] hover:border-b hover:border-[#c9a96e]/30 hover:pb-1"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
              <LanguageToggle locale={locale} setLocale={setLocale} />
              <a
                href="/#booking"
                className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/40 pb-1 hover:border-[#c9a96e] hover:text-[#f0eee9] transition-colors duration-500 ml-2"
              >
                {t("nav.bookSession")}
              </a>
            </div>

            {/* Mobile/tablet menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-[#7a7a7a] hover:text-[#c9a96e] transition-colors p-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                {mobileOpen ? (
                  <path d="M6 6l12 12M6 18L18 6" />
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h12" />
                    <path d="M4 17h8" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile/tablet menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-[#050505]/[0.98] backdrop-blur-3xl lg:hidden"
          >
            <div className="flex justify-end p-5 pt-6">
              <button
                onClick={() => setMobileOpen(false)}
                className="text-[#7a7a7a] hover:text-[#c9a96e] transition-colors p-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
                aria-label="Close menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
              {/* Top-level routes — always shown */}
              {secondTierLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href + "/"));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`text-editorial text-base tracking-[0.3em] uppercase transition-colors ${
                      isActive
                        ? "text-[#c9a96e]"
                        : "text-[#7a7a7a] hover:text-[#c9a96e]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {/* Homepage section anchors — only on home */}
              {isHome && (
                <div className="flex flex-col items-center gap-4 mt-8 pt-8 border-t border-white/[0.06] w-48">
                  {navItemKeys.slice(0, 3).map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-[10px] tracking-[0.3em] uppercase text-[#5a5a5a] hover:text-[#c9a96e] transition-colors"
                    >
                      {t(item.key)}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 mt-4">
                <LanguageToggle locale={locale} setLocale={setLocale} />
              </div>
              <a
                href="/#booking"
                onClick={() => setMobileOpen(false)}
                className="text-[11px] tracking-[0.3em] uppercase text-[#c9a96e] border-b border-[#c9a96e]/50 pb-2 hover:border-[#c9a96e] transition-colors mt-6"
              >
                {t("nav.bookSession")}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function LanguageToggle({ locale, setLocale }: { locale: string; setLocale: (l: "en" | "hi") => void }) {
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "hi" : "en")}
      className="text-[9px] tracking-[0.2em] uppercase text-[#7a7a7a] hover:text-[#c9a96e] transition-colors duration-500 cursor-pointer font-light focus:outline-none focus-visible:ring-1 focus-visible:ring-[#c9a96e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
      aria-label={`Switch to ${locale === "en" ? "Hindi" : "English"}`}
      title={locale === "en" ? "हिंदी में देखें" : "View in English"}
    >
      {locale === "en" ? "हि" : "En"}
    </button>
  );
}
