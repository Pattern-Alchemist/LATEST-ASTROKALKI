'use client';

import Script from 'next/script';
import { useEffect } from 'react';

/**
 * GA4 Tracking Component
 * 
 * Implements Google Analytics 4 with event tracking for:
 * - Lead magnet downloads
 * - Tool usage
 * - Email course signups
 * - Session bookings
 * - Page views
 */

interface GA4TrackerProps {
  measurementId?: string;
}

export function GA4Tracker({ measurementId }: GA4TrackerProps) {
  const id = measurementId || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  useEffect(() => {
    if (!id) return;

    // Track page views
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: window.location.pathname,
        page_title: document.title,
      });
    }
  }, []);

  if (!id) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <Script
        id="ga-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${id}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

/**
 * Track custom events
 * Usage: trackEvent('lead_magnet_download', { magnet_type: 'guide' })
 */
export function trackEvent(
  eventName: string,
  eventData?: Record<string, string | number | boolean>
) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventData);
  }
}

/**
 * Track user identity (after sign-in)
 */
export function trackUserId(userId: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', { user_id: userId });
  }
}
