import Link from "next/link";
import { Heart, Mail } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-card/50 border-t border-card-foreground/10">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">AstroKalki</h3>
            <p className="text-sm text-muted-foreground">
              Your trusted guide to cosmic wisdom and personal growth through astrology.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {["Home", "Readings", "Charts", "Horoscope"].map((link) => (
                <li key={link}>
                  <Link
                    href={link === "Home" ? "/" : `/${link.toLowerCase()}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm">
              {["Blog", "FAQ", "Guides", "Community"].map((link) => (
                <li key={link}>
                  <Link
                    href={`/${link.toLowerCase().replace(" ", "-")}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-semibold">Contact</h4>
            <div className="space-y-2">
              <a
                href="mailto:hello@astrokalki.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-4 h-4" />
                hello@astrokalki.com
              </a>
              <p className="text-xs text-muted-foreground">
                Available 24/7 for your inquiries
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-card-foreground/10 pt-8">
          {/* Bottom Links */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/cookies"
                className="hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>
              &copy; {currentYear} AstroKalki. All rights reserved. | Built with
              <Heart className="w-3 h-3 inline mx-1 text-accent" />
              for cosmic seekers
            </p>
            <div className="flex gap-4">
              {["Twitter", "Instagram", "Facebook"].map((social) => (
                <a
                  key={social}
                  href={`#${social.toLowerCase()}`}
                  className="hover:text-foreground transition-colors"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
