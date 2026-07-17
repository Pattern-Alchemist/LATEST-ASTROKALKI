import { createClient } from '@supabase/supabase-js';
import { Logger } from './logger';

const logger = new Logger();

/**
 * Supabase client for server-side operations.
 * Uses service role key for admin operations (bypass RLS).
 * 
 * NOTE: For client-side code, use NEXT_PUBLIC_SUPABASE_ANON_KEY instead.
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
  }
);

/**
 * Supabase client for client-side operations.
 * Uses anon key (respects RLS policies).
 */
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Execute a Supabase query with connection pooling and timeout handling.
 * 
 * For Vercel serverless functions, queries should complete within 5 seconds.
 * This wrapper helps monitor and optimize query performance.
 */
export async function executeWithTimeout<T>(
  queryName: string,
  query: () => Promise<T>,
  timeoutMs: number = 5000,
  requestId?: string
): Promise<T> {
  const actualRequestId = requestId || logger.getRequestId();
  const startTime = Date.now();

  logger.info(`query_started`, {
    queryName,
    timeoutMs,
    requestId: actualRequestId,
  });

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Query timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    );

    // Race the actual query against the timeout
    const result = await Promise.race([query(), timeoutPromise]);
    const duration = Date.now() - startTime;

    logger.info(`query_completed`, {
      queryName,
      duration,
      requestId: actualRequestId,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`query_failed`, {
      queryName,
      duration,
      error: error instanceof Error ? error.message : String(error),
      requestId: actualRequestId,
    });
    throw error;
  }
}

/**
 * Verify Supabase connection on app startup.
 */
export async function verifySupabaseConnection() {
  try {
    const { data, error } = await executeWithTimeout(
      'verify_connection',
      () =>
        supabaseAdmin
          .from('Booking')
          .select('id')
          .limit(1)
    );

    if (error) {
      logger.error('supabase_connection_failed', {
        error: error.message,
      });
      return false;
    }

    logger.info('supabase_connection_ok');
    return true;
  } catch (error) {
    logger.error('supabase_connection_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
