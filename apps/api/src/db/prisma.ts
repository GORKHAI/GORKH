import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __aiOperatorPrisma: PrismaClient | undefined;
}

/**
 * PrismaClient with production-hardened connection pooling.
 * 
 * Connection pool settings can be tuned via DATABASE_URL query params:
 *   postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30
 * 
 * Default Prisma pool size is calculated as: num_physical_cpus * 2 + 1
 * For production, explicitly set connection_limit based on your DB max_connections.
 * 
 * Recommended formula for PgBouncer/connection-limited setups:
 *   connection_limit = (DB_max_connections - reserved) / app_instances
 * 
 * Example for single-instance deployment with Postgres max_connections=100:
 *   connection_limit=20 (leaves headroom for migrations, admin, etc.)
 */
export const prisma =
  globalThis.__aiOperatorPrisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    // Additional Prisma engine configuration for production stability
    // Connection pooling is primarily configured via DATABASE_URL
    // See: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__aiOperatorPrisma = prisma;
}
