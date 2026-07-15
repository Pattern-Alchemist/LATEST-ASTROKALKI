/**
 * Analytics event tracking for AstroKalki
 * GA4 events for conversion tracking, funnel analysis, and ROI measurement
 */

export const analyticsEvents = {
  // Lead generation events
  leadCapture: {
    'lead_magnet_view': {
      category: 'lead_magnet',
      action: 'view',
      description: 'User viewed lead magnet download page',
    },
    'lead_magnet_download': {
      category: 'lead_magnet',
      action: 'download',
      description: 'User downloaded lead magnet (email captured)',
      conversionValue: 1,
    },
    'email_course_signup': {
      category: 'lead_generation',
      action: 'email_course_signup',
      description: 'User signed up for 5-day email course',
      conversionValue: 1,
    },
    'quiz_start': {
      category: 'engagement',
      action: 'quiz_start',
      description: 'User started shadow pattern or karmic loop quiz',
    },
    'quiz_complete': {
      category: 'lead_generation',
      action: 'quiz_complete',
      description: 'User completed quiz and shared email (lead captured)',
      conversionValue: 1,
    },
  },
  
  // Tool interaction events
  toolUsage: {
    'birth_chart_calculator_view': {
      category: 'free_tool',
      action: 'view',
      description: 'User viewed birth chart calculator',
    },
    'birth_chart_generated': {
      category: 'free_tool',
      action: 'interaction',
      description: 'User generated their birth chart',
      conversionValue: 0.5,
    },
    'pattern_analyzer_used': {
      category: 'free_tool',
      action: 'interaction',
      description: 'User analyzed emotional pattern',
      conversionValue: 0.5,
    },
    'compatibility_calculator_used': {
      category: 'free_tool',
      action: 'interaction',
      description: 'User checked astrological compatibility',
      conversionValue: 0.5,
    },
  },
  
  // Content engagement events
  content: {
    'insight_article_view': {
      category: 'content',
      action: 'view',
      description: 'User viewed insight/article',
    },
    'article_read_complete': {
      category: 'content',
      action: 'engagement',
      description: 'User read full article (time_on_page > 2 min)',
      conversionValue: 0.3,
    },
    'audio_narration_played': {
      category: 'content',
      action: 'engagement',
      description: 'User played audio narration of article',
      conversionValue: 0.3,
    },
    'chart_reading_view': {
      category: 'content',
      action: 'view',
      description: 'User viewed chart reading/analysis',
    },
  },
  
  // Booking/conversion events
  booking: {
    'session_booking_page_view': {
      category: 'booking',
      action: 'page_view',
      description: 'User viewed booking page',
    },
    'session_booked': {
      category: 'conversion',
      action: 'purchase',
      description: 'User booked a session',
      conversionValue: 1,
    },
    'session_completed': {
      category: 'conversion',
      action: 'purchase',
      description: 'User completed session (payment received)',
      conversionValue: 1,
      revenue: true,
    },
  },
  
  // User account events
  account: {
    'account_created': {
      category: 'user',
      action: 'account_create',
      description: 'User created account',
    },
    'profile_completed': {
      category: 'user',
      action: 'profile_update',
      description: 'User completed profile (birth chart details)',
    },
    'journal_entry_created': {
      category: 'engagement',
      action: 'journal_entry',
      description: 'User created journal entry',
    },
    'progress_viewed': {
      category: 'engagement',
      action: 'progress_view',
      description: 'User viewed progress dashboard',
    },
  },
  
  // Session/app events
  app: {
    'app_session_start': {
      category: 'session',
      action: 'start',
      description: 'User started app session',
    },
    'voice_input_used': {
      category: 'feature_usage',
      action: 'voice_input',
      description: 'User used voice input for micro-reading',
      conversionValue: 0.5,
    },
    'chart_image_upload': {
      category: 'feature_usage',
      action: 'upload',
      description: 'User uploaded birth chart image for analysis',
      conversionValue: 0.5,
    },
  },
};

/**
 * Track event in GA4
 */
export function trackEvent(
  eventName: string,
  eventData: Record<string, any> = {}
) {
  // Use gtag if available (client-side)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventData);
  }
  
  // Server-side tracking would go here
  // Log to analytics service, database, etc.
}

/**
 * Track conversion event (high-value events)
 */
export function trackConversion(
  conversionType: 'lead' | 'booking' | 'session_complete',
  metadata: Record<string, any> = {}
) {
  const conversionMap = {
    lead: 'lead_magnet_download',
    booking: 'session_booked',
    session_complete: 'session_completed',
  };
  
  trackEvent(conversionMap[conversionType], {
    conversion_type: conversionType,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Generate analytics dashboard data
 */
export const analyticsDashboard = {
  metrics: {
    totalVisitors: 'ga:users',
    newVisitors: 'ga:newUsers',
    bounceRate: 'ga:bounceRate',
    avgSessionDuration: 'ga:avgSessionDuration',
    conversions: 'ga:goalCompletionsAll',
    conversionRate: 'ga:goalConversionRateAll',
  },
  
  funnelStages: [
    { stage: 'Lead Magnet View', event: 'lead_magnet_view' },
    { stage: 'Lead Magnet Download', event: 'lead_magnet_download' },
    { stage: 'Free Tool Interaction', event: 'birth_chart_generated' },
    { stage: 'Email Course Signup', event: 'email_course_signup' },
    { stage: 'Session Booking View', event: 'session_booking_page_view' },
    { stage: 'Session Booked', event: 'session_booked' },
    { stage: 'Session Completed', event: 'session_completed' },
  ],
  
  cohorts: {
    leadMagnetCaptures: 'lead_magnet_download',
    toolUsers: 'birth_chart_generated',
    emailCourseEnrolled: 'email_course_signup',
    bookedSessions: 'session_booked',
    returningVisitors: 'ga:returningUsers',
  },
};
