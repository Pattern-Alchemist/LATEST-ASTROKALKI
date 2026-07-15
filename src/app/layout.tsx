import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AstroKalki - Cosmic Analysis & Astrology",
  description:
    "Discover your cosmic destiny with AstroKalki. Advanced astrology analysis, personalized horoscopes, and celestial insights.",
  keywords: [
    "astrology",
    "horoscope",
    "zodiac",
    "cosmic",
    "astro",
    "planets",
    "birth chart",
  ],
  authors: [{ name: "AstroKalki" }],
  creator: "AstroKalki",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://astrokalki.com",
    title: "AstroKalki - Cosmic Analysis & Astrology",
    description:
      "Discover your cosmic destiny with AstroKalki. Advanced astrology analysis, personalized horoscopes, and celestial insights.",
    siteName: "AstroKalki",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroKalki - Cosmic Analysis & Astrology",
    description:
      "Discover your cosmic destiny with AstroKalki. Advanced astrology analysis, personalized horoscopes, and celestial insights.",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans antialiased">
        <div className="relative min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  );
}
