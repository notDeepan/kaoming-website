import { copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client per process. Next's dev server re-evaluates modules on every
 * change, and a fresh client each time exhausts the database's connections
 * within a few edits, so in development the instance is parked on globalThis.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Preview mode: an ephemeral lead store on a read-only host.
 *
 * A serverless preview has no writable filesystem outside `/tmp` and no
 * Postgres, so `prisma.lead.create` throws and the RFQ returns a 500 — meaning
 * the one journey the whole site is built around dead-ends in exactly the demo
 * where somebody is being shown it.
 *
 * With `RFQ_EPHEMERAL_DB=1`, a migrated but empty SQLite file committed at
 * `prisma/preview.db` is copied to `/tmp` on cold start and used as the store.
 * The enquiry really is written and really is read back; it simply does not
 * outlive the instance.
 *
 * **Opt-in on purpose.** It is one environment variable, set only on a preview,
 * and it is never the default — a production deployment that quietly lost every
 * lead to a temp directory would be far worse than one that fails loudly. Set a
 * real `DATABASE_URL` and leave this unset (DEPLOYMENT.md).
 */
function ephemeralDatabaseUrl(): string | undefined {
  if (process.env.RFQ_EPHEMERAL_DB !== '1') return undefined;

  /**
   * `os.tmpdir()`, not a literal `/tmp`.
   *
   * The literal is what this was, and it takes the site down on Windows, where
   * there is no `/tmp`: the copy throws, and because the client is constructed
   * at module scope the throw escapes as a 500 on the RFQ route rather than as
   * a failed preview mode. Anyone running the preview flag locally to check it
   * — which is the only way to check it — hit that first.
   *
   * Everything here is also wrapped: this is a convenience for demos, and it
   * must never be the reason the application cannot start.
   */
  try {
    const target = join(tmpdir(), 'kaoming-preview.db');
    if (!existsSync(target)) {
      const seed = join(process.cwd(), 'prisma', 'preview.db');
      if (!existsSync(seed)) return undefined;
      copyFileSync(seed, target);
    }
    // Prisma wants a URL; on Windows the path contains backslashes and a drive
    // letter, which `file:` tolerates only with forward slashes.
    return `file:${target.replace(/\\/g, '/')}`;
  } catch {
    return undefined;
  }
}

function createClient(): PrismaClient {
  const url = ephemeralDatabaseUrl();
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
