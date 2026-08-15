import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client per process. Next's dev server re-evaluates modules on every
 * change, and a fresh client each time exhausts the database's connections
 * within a few edits, so in development the instance is parked on globalThis.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
