import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Centralized logger with correlation IDs for request tracking.
 * Logs are output as JSON to stdout for Vercel integration.
 */
export class Logger {
  private requestId: string;
  private logLevel: LogLevel;

  constructor(requestId?: string) {
    this.requestId = requestId || uuidv4();
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  /**
   * Set or update the request ID for this logger instance.
   */
  setRequestId(id: string) {
    this.requestId = id;
  }

  /**
   * Get the current request ID.
   */
  getRequestId(): string {
    return this.requestId;
  }

  /**
   * Log at debug level (lowest priority).
   */
  debug(message: string, metadata?: Record<string, any>) {
    this.log('debug', message, metadata);
  }

  /**
   * Log at info level.
   */
  info(message: string, metadata?: Record<string, any>) {
    this.log('info', message, metadata);
  }

  /**
   * Log at warn level.
   */
  warn(message: string, metadata?: Record<string, any>) {
    this.log('warn', message, metadata);
  }

  /**
   * Log at error level.
   */
  error(message: string, metadata?: Record<string, any>) {
    this.log('error', message, metadata);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    // Only log if level is equal to or higher priority than configured level
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentPriority = levels.indexOf(level);
    const configuredPriority = levels.indexOf(this.logLevel);

    if (currentPriority < configuredPriority) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      message,
      ...(metadata && { metadata }),
    };

    // Output as JSON for Vercel and other log collectors
    console.log(JSON.stringify(entry));
  }
}

/**
 * Global logger instance. In server contexts, prefer creating
 * a new Logger with a request-specific ID for correlation.
 */
export const logger = new Logger();
