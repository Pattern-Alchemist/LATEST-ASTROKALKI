/**
 * Production deployment configuration
 * All 5 deployment steps: Database, APIs, Email, Analytics, Domain
 */

export const deploymentConfig = {
  // STEP 1: Database Configuration
  database: {
    provider: process.env.DATABASE_PROVIDER || 'neon', // neon | vercel-postgres | supabase
    url: process.env.DATABASE_URL,
    // Connection pooling for production
    pooling: {
      enabled: true,
      min: 5,
      max: 20,
      timeout: 30000, // 30s
    },
    // Backup strategy
    backups: {
      enabled: true,
      frequency: 'daily', // daily | weekly
      retention: 30, // days
    },
    // Migration settings
    migrations: {
      autoMigrate: process.env.AUTO_MIGRATE === 'true',
      verbose: process.env.NODE_ENV === 'development',
    },
  },

  // STEP 2: API Integrations
  apis: {
    // AI/LLM APIs
    llm: {
      provider: process.env.LLM_PROVIDER || 'openai', // openai | anthropic | vercel-ai-gateway
      apiKey: process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY,
      model: process.env.LLM_MODEL || 'gpt-4-turbo',
      baseUrl: process.env.LLM_BASE_URL,
    },
    
    // Image generation for pattern portraits
    imageGeneration: {
      provider: process.env.IMAGE_PROVIDER || 'vercel-ai-gateway', // openai | fal | vercel-ai-gateway
      apiKey: process.env.IMAGE_API_KEY,
      model: process.env.IMAGE_MODEL || 'dall-e-3',
    },
    
    // Text-to-speech for audio narrations
    tts: {
      provider: process.env.TTS_PROVIDER || 'openai', // openai | elevenlabs
      apiKey: process.env.TTS_API_KEY || process.env.OPENAI_API_KEY,
      voice: process.env.TTS_VOICE || 'nova',
    },
    
    // Ephemeris/astrology data API
    ephemeris: {
      provider: process.env.EPHEMERIS_PROVIDER || 'swiss-ephemeris', // swiss-ephemeris | astroapi
      apiKey: process.env.EPHEMERIS_API_KEY,
      baseUrl: process.env.EPHEMERIS_BASE_URL,
    },
    
    // Payment processing (Stripe)
    payments: {
      provider: 'stripe',
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    
    // Analytics (Google Analytics 4)
    analytics: {
      provider: 'ga4',
      propertyId: process.env.GA4_PROPERTY_ID,
      measurementId: process.env.GA4_MEASUREMENT_ID,
      apiSecret: process.env.GA4_API_SECRET,
    },
  },

  // STEP 3: Email Configuration
  email: {
    // SMTP server
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    
    // Email service provider
    provider: process.env.EMAIL_PROVIDER || 'smtp', // smtp | sendgrid | mailgun | resend
    
    // Default sender
    defaultFrom: {
      name: 'AstroKalki',
      email: process.env.EMAIL_FROM || 'hello@astrokalki.com',
    },
    
    // Email templates directory
    templatesDir: './src/email-templates',
    
    // Drip campaign settings
    drip: {
      enabled: true,
      scheduleDaily: true,
      processBatchSize: 100,
    },
    
    // Transactional email retry
    retry: {
      attempts: 3,
      delayMs: 1000,
    },
  },

  // STEP 4: Analytics Configuration
  analytics: {
    // Google Analytics 4
    ga4: {
      enabled: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID !== undefined,
      measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
      apiSecret: process.env.GA4_API_SECRET,
    },
    
    // Event tracking
    events: {
      enabled: true,
      batchSize: 10,
      flushInterval: 10000, // 10s
    },
    
    // Custom conversion tracking
    conversions: {
      leadCapture: 'lead_magnet_download',
      emailCourseSignup: 'email_course_signup',
      sessionBooked: 'session_booked',
      sessionCompleted: 'session_completed',
    },
  },

  // STEP 5: Domain & Security Configuration
  domain: {
    // Production domain
    domain: process.env.NEXT_PUBLIC_DOMAIN || 'astrokalki.com',
    
    // URL configuration
    url: {
      protocol: process.env.NEXT_PUBLIC_PROTOCOL || 'https',
      host: process.env.NEXT_PUBLIC_DOMAIN || 'astrokalki.com',
      port: process.env.PORT || 3000,
    },
    
    // SSL/TLS
    ssl: {
      enabled: true,
      certPath: process.env.SSL_CERT_PATH,
      keyPath: process.env.SSL_KEY_PATH,
    },
    
    // Security headers
    security: {
      hsts: {
        enabled: true,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      cors: {
        enabled: true,
        origins: [
          process.env.NEXT_PUBLIC_DOMAIN || 'astrokalki.com',
          'localhost',
          '*.astrokalki.com',
        ],
      },
    },
    
    // DNS records to verify
    dnsRecords: [
      {
        type: 'A',
        name: '@',
        value: 'astrokalki.vercel.app', // Vercel IP
        description: 'Root domain pointing to Vercel',
      },
      {
        type: 'CNAME',
        name: 'www',
        value: 'cname.vercel-dns.com',
        description: 'WWW subdomain pointing to Vercel',
      },
      {
        type: 'TXT',
        name: '@',
        value: 'v=spf1 include:sendgrid.net ~all',
        description: 'SPF record for email authentication',
      },
      {
        type: 'CNAME',
        name: 'default._domainkey',
        value: 'sendgrid.net',
        description: 'DKIM record for email authentication',
      },
    ],
  },

  // Feature flags for gradual rollout
  features: {
    aiChat: process.env.FEATURE_AI_CHAT === 'true',
    chartAnalysis: process.env.FEATURE_CHART_ANALYSIS === 'true',
    voiceInput: process.env.FEATURE_VOICE_INPUT === 'true',
    emailCourse: process.env.FEATURE_EMAIL_COURSE === 'true',
    journaling: process.env.FEATURE_JOURNALING === 'true',
    liveBooking: process.env.FEATURE_LIVE_BOOKING === 'true',
  },

  // Monitoring & logging
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    sentry: {
      enabled: process.env.SENTRY_DSN !== undefined,
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    },
    datadog: {
      enabled: process.env.DD_API_KEY !== undefined,
      apiKey: process.env.DD_API_KEY,
    },
  },
};

/**
 * Validate all required environment variables for production
 */
export function validateProductionConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Database required
  if (!deploymentConfig.database.url) {
    errors.push('DATABASE_URL not set');
  }

  // At least one AI provider required
  if (!deploymentConfig.apis.llm.apiKey) {
    errors.push('OPENAI_API_KEY or AI_GATEWAY_API_KEY required for LLM');
  }

  // Email required
  if (!deploymentConfig.email.smtp.auth.user || !deploymentConfig.email.smtp.auth.pass) {
    errors.push('SMTP_USER and SMTP_PASSWORD required for email');
  }

  // Analytics recommended but not required
  if (!deploymentConfig.analytics.ga4.measurementId) {
    console.warn('GA4_MEASUREMENT_ID not set - analytics disabled');
  }

  // Domain should be production domain
  if (deploymentConfig.domain.domain === 'localhost' || deploymentConfig.domain.domain.includes('vercel.app')) {
    errors.push('NEXT_PUBLIC_DOMAIN should be production domain (e.g., astrokalki.com)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get connection status for all integrations
 */
export async function checkIntegrationStatus() {
  const status: Record<string, boolean> = {};

  // Check database
  status.database = !!deploymentConfig.database.url;

  // Check APIs
  status.llm = !!deploymentConfig.apis.llm.apiKey;
  status.imageGeneration = !!deploymentConfig.apis.imageGeneration.apiKey;
  status.tts = !!deploymentConfig.apis.tts.apiKey;
  status.payments = !!deploymentConfig.apis.payments.secretKey;
  status.analytics = !!deploymentConfig.analytics.ga4.measurementId;

  // Check email
  status.email = !!(deploymentConfig.email.smtp.auth.user && deploymentConfig.email.smtp.auth.pass);

  // Check domain
  status.domain = deploymentConfig.domain.domain !== 'localhost';

  return status;
}
