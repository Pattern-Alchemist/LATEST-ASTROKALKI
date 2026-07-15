import { PrismaClient } from '@prisma/client'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * AstroKalki Prisma singleton.
 *
 * Why this is more defensive than the stock Next.js + Prisma template:
 * The standard `globalThis.prisma` pattern caches the client across HMR
 * reloads to avoid leaking DB connections in dev. The catch: when
 * `prisma db push` regenerates the client (e.g. after a schema upgrade),
 * the cached client is STALE — it doesn't have delegates for newly-added
 * models, so `db.sessionRecap` becomes `undefined` and every call throws.
 *
 * Fix: in dev, key the cache on the schema.prisma file's mtime. When the
 * schema changes (db:push bumps the mtime), we drop the cached client and
 * instantiate a fresh one. Production behavior is unchanged (cache once,
 * reuse forever).
 *
 * Additional cache key: the @prisma/client generated output mtime. This
 * catches the case where `prisma db push` regenerates the client WITHOUT
 * bumping schema.prisma (e.g. when the schema is already in sync but the
 * generated client is missing the latest model delegates from a prior
 * push that wasn't followed by a server restart). Without this second
 * key, the cached client stays stale until the dev server is restarted.
 */
type CachedDb = PrismaClient & { __schemaMtime?: number; __clientMtime?: number }

const globalForPrisma = globalThis as unknown as {
  prisma: CachedDb | undefined
}

function schemaMtime(): number {
  try {
    return statSync(resolve(process.cwd(), 'prisma/schema.prisma')).mtimeMs
  } catch {
    return 0
  }
}

function clientMtime(): number {
  // The generated Prisma client lives in node_modules/.prisma/client.
  // Its index.js file is rewritten on every `prisma generate`, so its
  // mtime is a reliable proxy for "did the client code change".
  try {
    return statSync(
      resolve(process.cwd(), 'node_modules/.prisma/client/index.js')
    ).mtimeMs
  } catch {
    return 0
  }
}

function createClient(): CachedDb {
  // Preserve the original logging behavior (query-level logging in dev).
  return new PrismaClient({ log: ['query'] }) as CachedDb
}

const mtime = schemaMtime()
const cMtime = clientMtime()
const cached = globalForPrisma.prisma
const cacheFresh =
  cached !== undefined &&
  (process.env.NODE_ENV === 'production' ||
    (cached.__schemaMtime === mtime && cached.__clientMtime === cMtime))

export const db: PrismaClient = cacheFresh ? cached! : createClient()

if (process.env.NODE_ENV !== 'production') {
  ;(db as CachedDb).__schemaMtime = mtime
  ;(db as CachedDb).__clientMtime = cMtime
  globalForPrisma.prisma = db as CachedDb
}
