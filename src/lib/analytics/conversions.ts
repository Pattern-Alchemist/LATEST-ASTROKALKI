'use client';

import { trackEvent } from '@/components/analytics/ga4-tracker';

/**
 * Conversion Events Tracker
 * 
 * High-level tracking functions for key business events
 */

export const conversions = {
  // Lead Magnet Events
  leadMagnetViewed: (magnetId: string) => {
    trackEvent('lead_magnet_viewed', {
      magnet_id: magnetId,
      timestamp: Date.now(),
    });
  },

  leadMagnetDownloaded: (magnetId: string, email: string) => {
    trackEvent('lead_magnet_download', {
      magnet_id: magnetId,
      email_domain: email.split('@')[1],
      timestamp: Date.now(),
    });
  },

  // Free Tool Events
  toolAccessed: (toolName: string) => {
    trackEvent('free_tool_accessed', {
      tool_name: toolName,
      timestamp: Date.now(),
    });
  },

  toolResultGenerated: (toolName: string, resultType: string) => {
    trackEvent('free_tool_result', {
      tool_name: toolName,
      result_type: resultType,
      timestamp: Date.now(),
    });
  },

  toolResultShared: (toolName: string, platform: string) => {
    trackEvent('free_tool_shared', {
      tool_name: toolName,
      platform,
      timestamp: Date.now(),
    });
  },

  // Email Course Events
  emailCourseSignup: (dayOne: boolean = true) => {
    trackEvent('email_course_signup', {
      day_one_received: dayOne,
      timestamp: Date.now(),
    });
  },

  emailCourseOpened: (day: number) => {
    trackEvent('email_course_opened', {
      day,
      timestamp: Date.now(),
    });
  },

  emailCourseClicked: (day: number, linkPosition: string) => {
    trackEvent('email_course_link_click', {
      day,
      link_position: linkPosition,
      timestamp: Date.now(),
    });
  },

  // Session Events
  sessionBooked: (sessionType: string, price: number) => {
    trackEvent('session_booked', {
      session_type: sessionType,
      value: price,
      currency: 'USD',
      timestamp: Date.now(),
    });
  },

  sessionCompleted: (sessionType: string, duration: number) => {
    trackEvent('session_completed', {
      session_type: sessionType,
      duration_minutes: duration,
      timestamp: Date.now(),
    });
  },

  sessionReviewSubmitted: (rating: number) => {
    trackEvent('session_review', {
      rating,
      timestamp: Date.now(),
    });
  },

  // Engagement Events
  journalEntryCreated: () => {
    trackEvent('journal_entry_created', {
      timestamp: Date.now(),
    });
  },

  journalStreak: (days: number) => {
    trackEvent('journal_streak', {
      streak_days: days,
      timestamp: Date.now(),
    });
  },

  insightGenerated: (insightType: string) => {
    trackEvent('insight_generated', {
      insight_type: insightType,
      timestamp: Date.now(),
    });
  },

  // Newsletter Events
  newsletterSubscribed: () => {
    trackEvent('newsletter_subscription', {
      timestamp: Date.now(),
    });
  },

  newsletterUnsubscribed: (reason?: string) => {
    trackEvent('newsletter_unsubscribe', {
      reason: reason || 'user_requested',
      timestamp: Date.now(),
    });
  },

  // Error Tracking
  apiError: (endpoint: string, errorCode: number) => {
    trackEvent('api_error', {
      endpoint,
      error_code: errorCode,
      timestamp: Date.now(),
    });
  },

  // Custom Event
  customEvent: (eventName: string, data?: Record<string, any>) => {
    trackEvent(eventName, {
      ...data,
      timestamp: Date.now(),
    });
  },
};
