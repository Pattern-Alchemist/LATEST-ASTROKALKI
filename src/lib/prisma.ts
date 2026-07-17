import { PrismaClient } from '@prisma/client';
import { Logger } from './logger';

const logger = new Logger();

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client instance.
 * Reuses the same connection in development to avoid exhausting connection limits.
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'warn',
      },
      {
        emit: 'event',
        level: 'error',
      },
    ],
  });

// Log Prisma events
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    logger.debug('prisma_query', {
      query: e.query,
      params: e.params,
      duration: e.duration,
    });
  });

  prisma.$on('warn', (e) => {
    logger.warn('prisma_warn', {
      message: e.message,
    });
  });

  prisma.$on('error', (e) => {
    logger.error('prisma_error', {
      message: e.message,
    });
  });
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
