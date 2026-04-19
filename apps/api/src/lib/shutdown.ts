/**
 * Graceful shutdown handling for the API server.
 * 
 * Ensures clean resource cleanup on SIGTERM/SIGINT:
 * - Stops accepting new connections
 * - Closes active WebSocket and SSE connections
 * - Stops background timers/loops
 * - Disconnects from DB and Redis
 * - Exits with timeout protection
 */

import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { reportError, closeErrorTracking } from './error-tracking.js';

export interface ShutdownOptions {
  fastify: FastifyInstance;
  prisma: PrismaClient;
  stopRetentionScheduler: (() => void) | null;
  markAllDevicesDisconnected: () => void;
  closeWsConnections: () => void;
  closeSseConnections: () => void;
  shutdownTimeoutMs?: number;
}

let isShuttingDown = false;

export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

export async function gracefulShutdown(options: ShutdownOptions): Promise<void> {
  if (isShuttingDown) {
    options.fastify.log.info('Shutdown already in progress, ignoring duplicate signal');
    return;
  }
  
  isShuttingDown = true;
  const startTime = Date.now();
  const timeoutMs = options.shutdownTimeoutMs ?? 30_000;
  
  options.fastify.log.info({ timeoutMs }, 'Starting graceful shutdown...');
  
  // Set up timeout to force exit if graceful shutdown takes too long
  const timeoutId = setTimeout(() => {
    options.fastify.log.error(
      { elapsedMs: Date.now() - startTime },
      'Graceful shutdown timed out, forcing exit'
    );
    process.exit(1);
  }, timeoutMs);
  
  try {
    // Stage 1: Stop accepting new work
    options.fastify.log.info('Stage 1: Stopping background schedulers...');
    options.stopRetentionScheduler?.();
    
    // Stage 2: Mark devices disconnected so clients know we're going away
    options.fastify.log.info('Stage 2: Marking devices disconnected...');
    options.markAllDevicesDisconnected();
    
    // Stage 3: Close real-time connections
    options.fastify.log.info('Stage 3: Closing WebSocket connections...');
    options.closeWsConnections();
    
    options.fastify.log.info('Stage 4: Closing SSE connections...');
    options.closeSseConnections();
    
    // Stage 4: Close HTTP server (stop accepting new requests)
    options.fastify.log.info('Stage 5: Closing HTTP server...');
    await options.fastify.close();
    
    // Stage 5: Disconnect from databases
    options.fastify.log.info('Stage 6: Disconnecting from database...');
    await options.prisma.$disconnect();
    
    const elapsedMs = Date.now() - startTime;
    options.fastify.log.info({ elapsedMs }, 'Graceful shutdown completed successfully');
    
    clearTimeout(timeoutId);
    process.exit(0);
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    options.fastify.log.error({ err, elapsedMs }, 'Graceful shutdown failed');
    reportError(err instanceof Error ? err : new Error(String(err)), {
      tags: { phase: 'shutdown', elapsedMs },
    });
    // Flush error tracking before exit
    await closeErrorTracking();
    clearTimeout(timeoutId);
    process.exit(1);
  }
}

export function setupSignalHandlers(options: ShutdownOptions): void {
  const handleSignal = (signal: string) => {
    options.fastify.log.info({ signal }, `Received ${signal}, initiating shutdown`);
    void gracefulShutdown(options);
  };
  
  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  
  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (err) => {
    options.fastify.log.error({ err }, 'Uncaught exception, initiating emergency shutdown');
    reportError(err, { tags: { type: 'uncaught_exception' } });
    void gracefulShutdown({ ...options, shutdownTimeoutMs: 10_000 });
  });
  
  process.on('unhandledRejection', (reason) => {
    options.fastify.log.error({ reason }, 'Unhandled rejection, initiating emergency shutdown');
    reportError(reason instanceof Error ? reason : new Error(String(reason)), {
      tags: { type: 'unhandled_rejection' },
    });
    void gracefulShutdown({ ...options, shutdownTimeoutMs: 10_000 });
  });
}
