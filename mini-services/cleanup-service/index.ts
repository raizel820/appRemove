/**
 * Background Cleanup Service for Expired Order Number Reservations
 *
 * This service runs periodically to clean up expired reservations
 * and transition them to BLOCKED state.
 *
 * Port: 3004
 */

import { PrismaClient } from '@prisma/client';
import { OrderNumberState } from '@prisma/client';

const prisma = new PrismaClient();
const RESERVATION_TTL_MINUTES = 10;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes
const SERVICE_PORT = 3004;

interface CleanupStats {
  checked: number;
  cleaned: number;
  errors: number;
  startTime: Date;
  lastCleanupTime: Date;
}

const stats: CleanupStats = {
  checked: 0,
  cleaned: 0,
  errors: 0,
  startTime: new Date(),
  lastCleanupTime: new Date(),
};

/**
 * Get numbers in state RESERVED with expired reservations
 */
async function getExpiredReservations() {
  const now = new Date();
  const expiresBefore = new Date(now.getTime() - RESERVATION_TTL_MINUTES * 60 * 1000);

  const expiredNumbers = await prisma.orderNumber.findMany({
    where: {
      state: OrderNumberState.RESERVED,
      reservedAt: {
        lt: expiresBefore,
      },
    },
    select: {
      number: true,
      state: true,
      reservedBy: true,
      reservedAt: true,
      notes: true,
    },
  });

  return expiredNumbers;
}

/**
 * Clean up expired reservations by transitioning to BLOCKED
 */
async function cleanupExpiredReservations() {
  try {
    console.log('🔍 Checking for expired reservations...');
    
    const expiredNumbers = await getExpiredReservations();
    
    if (expiredNumbers.length === 0) {
      console.log('✅ No expired reservations found');
      return;
    }

    console.log(`📊 Found ${expiredNumbers.length} expired reservations`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const num of expiredNumbers) {
      try {
        // Transition to BLOCKED (safer default)
        // Could also transition to REUSABLE if tracking original state
        await prisma.orderNumber.update({
          where: { number: num.number },
          data: {
            state: OrderNumberState.BLOCKED,
            reservedBy: null,
            reservedAt: null,
            notes: `Blocked due to expired reservation (was ${num.state})`,
            updatedAt: new Date(),
          },
        });

        console.log(`✅ Cleaned up reservation for number ${num.number} (${num.state})`);
        cleanedCount++;
      } catch (error: any) {
        console.error(`❌ Error cleaning up number ${num.number}:`, error.message);
        errorCount++;
      }
    }

    // Update stats
    stats.checked = expiredNumbers.length;
    stats.cleaned = cleanedCount;
    stats.errors = errorCount;
    stats.lastCleanupTime = new Date();

    const runtime = Date.now() - stats.startTime.getTime();
    const hours = Math.floor(runtime / (1000 * 60 * 60));
    const minutes = Math.floor((runtime % (1000 * 60 * 60)) / (1000 * 60));

    console.log('\n' + '='.repeat(50));
    console.log('📋 Cleanup Summary:');
    console.log(`  Checked: ${stats.checked} expired reservations`);
    console.log(`  Cleaned: ${stats.cleaned} reservations`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Runtime: ${hours}h ${minutes}m`);
    console.log(`  Next cleanup in ${CLEANUP_INTERVAL_MS / 1000 / 60} minutes`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('💥 Error during cleanup:', error);
    stats.errors++;
  }
}

/**
 * Start periodic cleanup
 */
function startPeriodicCleanup() {
  console.log('🚀 Starting periodic cleanup service...');
  console.log(`⏰ Cleanup interval: ${CLEANUP_INTERVAL_MS / 1000 / 60} minutes`);
  console.log(`⏰ Reservation TTL: ${RESERVATION_TTL_MINUTES} minutes`);
  console.log(`📍 Service port: ${SERVICE_PORT}\n`);

  // Run initial cleanup
  cleanupExpiredReservations();

  // Schedule periodic cleanup
  setInterval(() => {
    cleanupExpiredReservations();
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Health check endpoint for monitoring
 */
async function handleHealthCheck(request: Request) {
  const uptime = Date.now() - stats.startTime.getTime();
  const timeSinceLastCleanup = Date.now() - stats.lastCleanupTime.getTime();

  return new Response(JSON.stringify({
    status: 'healthy',
    uptime: `${Math.floor(uptime / 1000)}s`,
    lastCleanup: stats.lastCleanupTime.toISOString(),
    timeSinceLastCleanup: `${Math.floor(timeSinceLastCleanup / 1000)}s`,
    stats: {
      totalChecked: stats.checked,
      totalCleaned: stats.cleaned,
      totalErrors: stats.errors,
    },
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Manual trigger cleanup endpoint
 */
async function handleManualCleanup(request: Request) {
  console.log('🔄 Manual cleanup triggered');
  await cleanupExpiredReservations();

  return new Response(JSON.stringify({
    success: true,
    message: 'Cleanup completed',
    stats: {
      checked: stats.checked,
      cleaned: stats.cleaned,
      errors: stats.errors,
    },
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Start HTTP server for health checks and manual triggers
 */
function startHttpServer() {
  const server = Bun.serve({
    port: SERVICE_PORT,
    fetch(req) {
      const url = new URL(req.url);

      // Health check
      if (url.pathname === '/health') {
        return handleHealthCheck(req);
      }

      // Manual cleanup trigger
      if (url.pathname === '/cleanup') {
        return handleManualCleanup(req);
      }

      // 404 for unknown paths
      return new Response('Not Found', { status: 404 });
    },
  });

  console.log(`🌐 HTTP server started on port ${SERVICE_PORT}`);
  console.log(`   Health check: http://localhost:${SERVICE_PORT}/health`);
  console.log(`   Manual cleanup: http://localhost:${SERVICE_PORT}/cleanup\n`);
}

// Start the service
startPeriodicCleanup();
startHttpServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down cleanup service...');
  prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down cleanup service...');
  prisma.$disconnect();
  process.exit(0);
});
