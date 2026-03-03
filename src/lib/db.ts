// Database client singleton
// Updated to work with regenerated Prisma client with OrderNumbers and VerificationToken models

import { PrismaClient } from '@prisma/client'

// Force regeneration time - change this to force a new Prisma client instance
const FORCE_REGEN_TIME = '2025-03-02-backup-model-v2'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __forceRegenTime?: string
}

// If force regen time doesn't match, invalidate cache
if (globalForPrisma.__forceRegenTime !== FORCE_REGEN_TIME) {
  globalForPrisma.prisma = undefined
  globalForPrisma.__forceRegenTime = FORCE_REGEN_TIME
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
